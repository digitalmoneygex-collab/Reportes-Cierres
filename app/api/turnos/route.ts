import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
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
}

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  // Buscar perfil del usuario
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre_completo, cedula, rol')
    .eq('id', user.id)
    .single();

  // Buscar turno activo
  let query = supabase
    .from('turnos')
    .select('*')
    .is('cerrado_at', null)
    .order('abierto_at', { ascending: false })
    .limit(1);

  // Si no es supervisor, solo buscar su propio turno
  if (perfil?.rol !== 'SUPERVISOR') {
    query = query.eq('usuario_id', user.id);
  }

  const { data: turnoActivo } = await query.maybeSingle();

  if (turnoActivo) {
    return NextResponse.json({ 
      ok: true, 
      active: true, 
      turno: turnoActivo,
      perfil 
    });
  }

  return NextResponse.json({ ok: true, active: false, perfil });
}

export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  // Buscar el ultimo turno CERRADO EN EL SISTEMA (de cualquier usuario) para saber de donde partir.
  // Si no hay hoy, empezar desde las 06:00.
  const now = new Date();
  
  // Buscar último turno cerrado (global o del dia, busquemos el ultimo cerrado globalmente)
  const { data: lastTurno } = await supabase
    .from('turnos')
    .select('cerrado_at')
    .not('cerrado_at', 'is', null)
    .order('cerrado_at', { ascending: false })
    .limit(1)
    .single();

  let abierto_at = new Date();
  
  // Si existe un último turno cerrado, y fue HOY (despues de las 6am), heredamos esa hora para no dejar gaps.
  // Pero para simplicidad, heredamos la hora exacta del ultimo cierre sin importar nada. 
  // Wait, si el ultimo cierre fue ayer a las 11pm, hoy el nuevo turno heredaría desde las 11pm. Eso esta bien, 
  // incluye las ventas de la madrugada si hubo.
  if (lastTurno && lastTurno.cerrado_at) {
    abierto_at = new Date(lastTurno.cerrado_at);
  } else {
    // Fallback: 6:00 AM de hoy
    abierto_at.setHours(6, 0, 0, 0);
  }

  // Crear el turno
  const { data: newTurno, error } = await supabase
    .from('turnos')
    .insert({
      usuario_id: user.id,
      abierto_at: abierto_at.toISOString()
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, turno: newTurno });
}

export async function PUT(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  let query = supabase
    .from('turnos')
    .select('*')
    .is('cerrado_at', null)
    .order('abierto_at', { ascending: false })
    .limit(1);

  if (perfil?.rol !== 'SUPERVISOR') {
    query = query.eq('usuario_id', user.id);
  }

  const { data: turnoActivo } = await query.maybeSingle();

  if (!turnoActivo) return NextResponse.json({ ok: false, error: 'No hay turno activo' }, { status: 400 });

  // Update cerrado_at
  const { error } = await supabase
    .from('turnos')
    .update({ 
      cerrado_at: new Date().toISOString()
    })
    .eq('id', turnoActivo.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  
  return NextResponse.json({ ok: true });
}
