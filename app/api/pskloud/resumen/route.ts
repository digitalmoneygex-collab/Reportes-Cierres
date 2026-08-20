import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/pskloud/resumen
// Lee el snapshot más reciente subido por sync-pskloud.js local
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('pskloud_snapshot')
      .select('*')
      .eq('fecha', today)
      .maybeSingle();

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

    return NextResponse.json({
      ok: true,
      synced_at: data.synced_at,
      corteCaja: {
        totalBs: data.corte_caja_bs,
        tasa: 0, // se completará en el front con la tasa del día
        totalUsd: 0,
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
