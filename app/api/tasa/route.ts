import { NextResponse } from 'next/server';
import { getTasaDelDia } from '@/lib/tasa';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    const tasa = await getTasaDelDia(force);
    
    // Fetch last_update to return in the JSON
    const { data: config } = await supabaseAdmin.from('configuracion').select('ultima_actualizacion_tasa').single();
    
    return NextResponse.json({
      ok: true,
      tasa,
      last_update: config?.ultima_actualizacion_tasa
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
