import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

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

export async function GET(request: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  // Buscar perfil del usuario
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre_completo, cedula, rol')
    .eq('id', user.id)
    .single();

  // Buscar los últimos 20 turnos
  let query = supabase
    .from('turnos')
    .select('*')
    .order('abierto_at', { ascending: false })
    .limit(20);

  // Si no es supervisor, solo buscar sus propios turnos
  if (perfil?.rol !== 'SUPERVISOR') {
    query = query.eq('usuario_id', user.id);
  }

  const { data: turnos, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    ok: true, 
    turnos: turnos || []
  });
}
