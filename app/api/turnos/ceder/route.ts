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

export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol !== 'SUPERVISOR') {
    return NextResponse.json({ ok: false, error: 'Solo los supervisores pueden ceder turnos' }, { status: 403 });
  }

  let body: any = {};
  try { body = await req.json(); } catch(e){}
  const { nuevo_usuario_id } = body;

  if (!nuevo_usuario_id) {
    return NextResponse.json({ ok: false, error: 'Debe seleccionar un usuario destino' }, { status: 400 });
  }

  // Buscar el turno activo
  let query = supabase
    .from('turnos')
    .select('*')
    .is('cerrado_at', null)
    .order('abierto_at', { ascending: false })
    .limit(1);

  const { data: turnoActivo } = await query.maybeSingle();

  if (!turnoActivo) return NextResponse.json({ ok: false, error: 'No hay turno activo para ceder' }, { status: 400 });

  // Update usuario_id
  const { error } = await supabase
    .from('turnos')
    .update({ 
      usuario_id: nuevo_usuario_id
    })
    .eq('id', turnoActivo.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  
  return NextResponse.json({ ok: true });
}
