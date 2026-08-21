import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const abierto_at = searchParams.get('abierto_at');
    const cerrado_at = searchParams.get('cerrado_at');
    const dateParam = searchParams.get('date');

    let start: Date;
    let end: Date;

    if (abierto_at) {
      start = new Date(abierto_at);
      end = cerrado_at ? new Date(cerrado_at) : new Date(); // Si está activo, hasta ahora
    } else if (dateParam) {
      start = new Date(`${dateParam}T00:00:00.000-04:00`);
      end = new Date(`${dateParam}T23:59:59.999-04:00`);
    } else {
      // Legacy / Fallback
      const { data: config } = await supabaseAdmin.from('configuracion').select('start_time').eq('id', 1).single();
      const startTime = config?.start_time || '06:00';
      
      const now = new Date();
      const vzDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      
      const [sh, sm] = startTime.split(':').map(Number);
      const resetMinutes = sh * 60 + sm;
      const currentMinutes = vzDate.getHours() * 60 + vzDate.getMinutes();
      
      if (currentMinutes < resetMinutes) {
        vzDate.setDate(vzDate.getDate() - 1);
      }
      
      const y = vzDate.getFullYear();
      const m = String(vzDate.getMonth() + 1).padStart(2, '0');
      const d = String(vzDate.getDate()).padStart(2, '0');
      
      start = new Date(`${y}-${m}-${d}T${startTime}:00.000-04:00`);
      
      const nextDay = new Date(vzDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const ny = nextDay.getFullYear();
      const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
      const nd = String(nextDay.getDate()).padStart(2, '0');
      
      end = new Date(`${ny}-${nm}-${nd}T${startTime}:00.000-04:00`);
      end = new Date(end.getTime() - 1);
    }

    const [tasaResult, facturasResult, articulosResult] = await Promise.all([
      getTasaDelDia().catch(() => 0),
      supabaseAdmin
        .from('pskloud_facturas')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('pskloud_articulos')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString())
    ]);

    if (facturasResult.error) throw new Error(facturasResult.error.message);
    if (articulosResult.error) throw new Error(articulosResult.error.message);

    const facturas = facturasResult.data || [];
    const articulos = articulosResult.data || [];

    // Calcular Totales
    let totalBs = 0;
    let devolucionesEfBs = 0;

    facturas.forEach(f => {
      const isNeg = f.tipo_doc === 'DEV' || f.tipo_doc === 'N/C' || f.tipo_doc === 'NC';
      const m = Number(f.monto_bs) || 0;
      if (isNeg) {
        devolucionesEfBs += m;
      } else {
        totalBs += m;
      }
    });

    const totalRecibidoBs = totalBs - devolucionesEfBs;
    const tasa = Number(tasaResult ?? 0);
    const totalBsUsd = tasa > 0 ? totalBs / tasa : 0;
    const devolucionesEfUsd = tasa > 0 ? devolucionesEfBs / tasa : 0;
    const totalRecibidoUsd = tasa > 0 ? totalRecibidoBs / tasa : 0;

    // Métodos de Pago Conciliados
    const metodosPago = facturas.filter(f => f.procesado).reduce((acc: any, curr) => {
      if (!curr.metodo_pago) return acc;
      let metodoPagoReal = curr.metodo_pago;
      let isDevolucionManual = false;

      if (curr.metodo_pago.startsWith('dev_')) {
        metodoPagoReal = curr.metodo_pago.replace('dev_', '');
        isDevolucionManual = true;
      }

      const exists = acc.find((m: any) => m.metodo === metodoPagoReal);
      const isNegative = curr.tipo_doc === 'DEV' || curr.tipo_doc === 'N/C' || curr.tipo_doc === 'NC' || isDevolucionManual || curr.metodo_pago === 'devolucion' || curr.metodo_pago === 'gasto';
      const monto = isNegative ? -Math.abs(Number(curr.monto_bs)) : Math.abs(Number(curr.monto_bs));

      if (exists) {
        exists.cantidad += 1;
        exists.totalBs += monto;
      } else {
        acc.push({ metodo: metodoPagoReal, cantidad: 1, totalBs: monto });
      }
      return acc;
    }, []);

    // Agrupar Articulos
    const agruparArticulos = (cat: string) => {
      const filtrados = articulos.filter(a => a.categoria === cat);
      const map = new Map<string, number>();
      filtrados.forEach(a => {
        map.set(a.nombre, (map.get(a.nombre) || 0) + Number(a.cantidad));
      });
      return Array.from(map.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
    };

    const reposteriaItems = agruparArticulos('reposteria');
    const reposteriaTotal = reposteriaItems.reduce((acc, i) => acc + i.cantidad, 0);

    return NextResponse.json({
      ok: true,
      synced_at: new Date().toISOString(),
      is_recent: true,
      corteCaja: {
        totalBs,
        totalBsUsd,
        devolucionesEfBs,
        devolucionesEfUsd,
        totalRecibidoBs,
        totalRecibidoUsd,
        tasa,
        totalUsd: totalRecibidoUsd,
      },
      metodosPago,
      burguer: {
        combosHamb: [], // En esta iteración simplificada mandamos los items raw al PskloudPanel
        hambSueltas: agruparArticulos('burguer'),
        perros: [],
        otros: [],
        totalesInsumos: {}
      },
      pasteles: {
        pasapalos: [],
        pequenos: agruparArticulos('pasteles'),
        empanadas: [],
        grandes: [],
        otros: [],
        totalesInsumos: {}
      },
      reposteria: {
        items: reposteriaItems,
        total: reposteriaTotal
      }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
