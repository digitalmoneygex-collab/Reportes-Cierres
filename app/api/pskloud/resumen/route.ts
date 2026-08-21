import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

// GET /api/pskloud/resumen
// Lee el snapshot más reciente subido por sync-pskloud.js local
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD

    let start: Date;
    let end: Date;

    if (dateParam) {
      start = new Date(`${dateParam}T00:00:00.000-04:00`);
      end = new Date(`${dateParam}T23:59:59.999-04:00`);
    } else {
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

    // Buscar el snapshot más reciente dentro del rango lógico del día
    const [{ data, error }, tasaResult] = await Promise.all([
      supabaseAdmin
        .from('pskloud_snapshot')
        .select('*')
        .gte('synced_at', start.toISOString())
        .lte('synced_at', end.toISOString())
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getTasaDelDia().catch(() => 0), // Si falla la tasa, usar 0 sin romper el route
    ]);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        ok: false,
        error: 'Sin datos PSKLOUD. Ejecuta: node sync-pskloud.js en la PC local.',
        noData: true,
      });
    }

    // Verificar que el snapshot sea del día de hoy (Venezuela) o de las últimas 24h
    const syncedAt  = new Date(data.synced_at);
    const hoursAgo  = (Date.now() - syncedAt.getTime()) / (1000 * 60 * 60);
    const isRecent  = hoursAgo < 24;

    const tasa               = Number(tasaResult ?? 0);
    const totalBs             = Number(data.corte_caja_bs ?? 0);           // Total Ingresos (bruto)
    const devolucionesEfBs    = Number(data.devoluciones_efectivo_bs ?? 0); // Devoluc. Efect.(-)
    const totalRecibidoBs     = Number(data.total_recibido_bs ?? totalBs);  // TOTAL RECIBIDO

    // Conversiones USD
    const totalBsUsd          = tasa > 0 ? totalBs / tasa : 0;
    const devolucionesEfUsd   = tasa > 0 ? devolucionesEfBs / tasa : 0;
    const totalRecibidoUsd    = tasa > 0 ? totalRecibidoBs / tasa : 0;

    return NextResponse.json({
      ok: true,
      synced_at: data.synced_at,
      is_recent: isRecent,
      corteCaja: {
        // Total Ingresos (corte_caja_bs)
        totalBs,
        totalBsUsd,
        // Devoluciones en efectivo
        devolucionesEfBs,
        devolucionesEfUsd,
        // TOTAL RECIBIDO = lo que se muestra como "Ventas Sistema"
        totalRecibidoBs,
        totalRecibidoUsd,
        tasa,
        // Alias legacy para compatibilidad
        totalUsd: totalRecibidoUsd,
      },
      burguer:    data.burguer,
      pasteles:   data.pasteles,
      tequeños:   data.teques,
      reposteria: data.reposteria,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
