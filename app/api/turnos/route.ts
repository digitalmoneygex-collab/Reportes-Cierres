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

  // Ya no heredamos la hora del turno anterior. 
  // El turno inicia exactamente en el momento en que se le da a "Abrir Turno".
  let abierto_at = new Date();

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
