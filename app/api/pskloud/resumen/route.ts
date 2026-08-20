import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

// GET /api/pskloud/resumen
// Lee el snapshot más reciente subido por sync-pskloud.js local
export async function GET() {
  try {
    // Fecha Venezuela (UTC-4)
    const vzDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const today = `${vzDate.getFullYear()}-${String(vzDate.getMonth() + 1).padStart(2, '0')}-${String(vzDate.getDate()).padStart(2, '0')}`;

    const [{ data, error }, tasaResult] = await Promise.all([
      supabaseAdmin
        .from('pskloud_snapshot')
        .select('*')
        .eq('fecha', today)
        .maybeSingle(),
      getTasaDelDia().catch(() => 0), // Si falla la tasa, usar 0 sin romper el route
    ]);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        ok: false,
        error: 'Sin datos PSKLOUD para hoy. Ejecuta sync-pskloud.js en la PC local.',
        noData: true,
      });
    }

    const tasa     = Number(tasaResult ?? 0);
    const totalBs  = Number(data.corte_caja_bs ?? 0);
    const totalUsd = tasa > 0 ? totalBs / tasa : 0;

    return NextResponse.json({
      ok: true,
      synced_at: data.synced_at,
      corteCaja: {
        totalBs,
        tasa,
        totalUsd,
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
