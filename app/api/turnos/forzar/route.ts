import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { },
        remove(name: string, options: CookieOptions) { },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  // Verificar rol SUPERVISOR
  const { data: profile } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (profile?.rol !== 'SUPERVISOR') {
    return NextResponse.json({ ok: false, error: 'Prohibido: Solo supervisores' }, { status: 403 });
  }

  const { hora } = await req.json(); // ej: '14:00'
  if (!hora) return NextResponse.json({ ok: false, error: 'Hora requerida' }, { status: 400 });

  // Verificar si hay algun turno ACTIVO. Si hay, NO se puede forzar cierre.
  const { data: activo } = await supabase
    .from('turnos')
    .select('id')
    .is('cerrado_at', null)
    .limit(1)
    .maybeSingle();

  if (activo) {
    return NextResponse.json({ ok: false, error: 'Hay un turno activo actualmente. Ciérralo primero.' }, { status: 400 });
  }

  // Obtener último turno cerrado
  const { data: lastTurno } = await supabase
    .from('turnos')
    .select('cerrado_at')
    .not('cerrado_at', 'is', null)
    .order('cerrado_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const [h, m] = hora.split(':').map(Number);
  const forzadoAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

  // Validar que forzadoAt no sea futuro
  if (forzadoAt.getTime() > now.getTime()) {
    return NextResponse.json({ ok: false, error: 'La hora forzada no puede ser en el futuro.' }, { status: 400 });
  }

  // Validar que forzadoAt sea POSTERIOR al último cierre registrado
  if (lastTurno && lastTurno.cerrado_at) {
    const lastCloseTime = new Date(lastTurno.cerrado_at).getTime();
    if (forzadoAt.getTime() <= lastCloseTime) {
      return NextResponse.json({ ok: false, error: 'La hora debe ser posterior al último cierre registrado.' }, { status: 400 });
    }
  }

  // Crear un turno "fantasma" que se abre y cierra en el mismo segundo o hereda 
  // No, the user wants "hacer un corte en una hora en especifico... para que el nuevo cajero herede desde las 14:00".
  // The easiest way is to insert a closed shift at that forced time.
  
  let inheritedOpen = new Date();
  inheritedOpen.setHours(6, 0, 0, 0);
  if (lastTurno && lastTurno.cerrado_at) {
    inheritedOpen = new Date(lastTurno.cerrado_at);
  }

  // Crear turno que representa el intervalo abandonado
  const { data: newTurno, error } = await supabase
    .from('turnos')
    .insert({
      usuario_id: user.id, // El supervisor toma responsabilidad
      abierto_at: inheritedOpen.toISOString(),
      cerrado_at: forzadoAt.toISOString(),
      snapshot: { forced: true }
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, turno: newTurno });
}
