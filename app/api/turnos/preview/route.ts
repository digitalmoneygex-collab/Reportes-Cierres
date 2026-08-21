import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!startStr) {
      return NextResponse.json({ ok: false, error: 'Se requiere fecha de inicio (start)' }, { status: 400 });
    }

    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();

    const [tasaResult, facturasResult, pagosResult, articulosResult, turnoResult] = await Promise.all([
      getTasaDelDia().catch(() => 0),
      supabaseAdmin
        .from('pskloud_facturas')
        .select('monto_bs, tipo_doc, metodo_pago, procesado')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('pagos_whatsapp')
        .select('id, monto_bs, procesado')
        .eq('es_duplicado', false)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabaseAdmin
        .from('pskloud_articulos')
        .select('*')
        .gte('fechayhora', start.toISOString())
        .lte('fechayhora', end.toISOString()),
      supabaseAdmin
        .from('turnos')
        .select('*, usuarios(nombre_completo, cedula)')
        .eq('abierto_at', start.toISOString())
        .maybeSingle()
    ]);

    if (facturasResult.error) throw new Error(facturasResult.error.message);
    if (pagosResult.error) throw new Error(pagosResult.error.message);
    if (articulosResult.error) throw new Error(articulosResult.error.message);

    const facturas = facturasResult.data || [];
    const pagos = pagosResult.data || [];
    const articulos = articulosResult.data || [];
    const turno = turnoResult?.data;
    
    // Extraer datos del cajero
    // @ts-ignore
    const cajero = turno?.usuarios ? { nombre: turno.usuarios.nombre_completo, cedula: turno.usuarios.cedula } : { nombre: 'CAJERO DESCONOCIDO', cedula: 'V-00000000' };

    const tasa = Number(tasaResult ?? 0);

    // Agrupar Articulos
    const agruparArticulos = (cat: string) => {
      const filtrados = articulos.filter(a => a.categoria === cat);
      const map = new Map<string, number>();
      filtrados.forEach(a => {
        map.set(a.nombre, (map.get(a.nombre) || 0) + Number(a.cantidad));
      });
      return Array.from(map.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
    };

    const burguer = agruparArticulos('burguer');
    const pasteles = agruparArticulos('pasteles');
    const reposteria = agruparArticulos('reposteria');
    const articulosAgrupados = { burguer, pasteles, reposteria };

    // Calcular PSKloud Ventas (Ingresos)
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
    const totalBsUsd = tasa > 0 ? totalBs / tasa : 0;
    const devolucionesEfUsd = tasa > 0 ? devolucionesEfBs / tasa : 0;
    const totalRecibidoUsd = tasa > 0 ? totalRecibidoBs / tasa : 0;

    // Desglose por métodos de pago
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

    // Calcular Pagos Móviles Capturados vs Conciliados
    const totalPagosBs = pagos.reduce((s, p) => s + (p.monto_bs ?? 0), 0);
    const pagosRegistradosCount = pagos.length;
    const pagosProcesadosCount = pagos.filter(p => p.procesado).length;
    const pagosSinProcesarCount = pagosRegistradosCount - pagosProcesadosCount;
    
    // Facturas en PSKloud marcadas como Pago Movil pero sin procesar
    const facturasPagoMovil = facturas.filter(f => f.metodo_pago === 'pago_movil');
    const facturasPagoMovilProcesadas = facturasPagoMovil.filter(f => f.procesado).length;
    const facturasPagoMovilPendientes = facturasPagoMovil.length - facturasPagoMovilProcesadas;

    return NextResponse.json({
      ok: true,
      data: {
        rango: { start: start.toISOString(), end: end.toISOString() },
        cajero,
        pskloud: {
          tasa,
          totalBs,
          totalBsUsd,
          devolucionesEfBs,
          devolucionesEfUsd,
          totalRecibidoBs,
          totalRecibidoUsd,
          totalFacturas: facturas.length
        },
        metodosPago,
        articulos: articulosAgrupados,
        pagos: {
          totalBs: totalPagosBs,
          registradosCount: pagosRegistradosCount,
          procesadosCount: pagosProcesadosCount,
          sinProcesarCount: pagosSinProcesarCount,
        },
        alertas: {
          hayPagosSinConciliar: pagosSinProcesarCount > 0,
          hayFacturasSinConciliar: facturasPagoMovilPendientes > 0,
          facturasPendientesCount: facturasPagoMovilPendientes
        }
      }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
