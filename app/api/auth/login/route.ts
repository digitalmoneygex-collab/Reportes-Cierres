import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    // Convertir cédula a correo falso para Supabase Auth
    const email = username.includes('@') ? username : `${username}@gex.com`;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    // Ahora buscamos su perfil en public.usuarios
    const { data: profile, error: profileErr } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      // Si no tiene perfil, cerramos sesión por seguridad
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: 'Usuario no tiene perfil en el sistema. Contacte al supervisor.' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, user: profile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Error de red' }, { status: 500 });
  }
}
