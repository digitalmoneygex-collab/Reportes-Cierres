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

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // Determinar los límites de tiempo (start y end)
  let start: Date;
  let end: Date;

  if (dateParam) {
    start = new Date(`${dateParam}T00:00:00.000-04:00`);
    end = new Date(`${dateParam}T23:59:59.999-04:00`);
  } else {
    // Si no se especifica fecha, usar el día operativo actual
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

  // Buscar todos los turnos que empezaron dentro de este día operativo
  let query = supabase
    .from('turnos')
    .select('*')
    .gte('abierto_at', start.toISOString())
    .lte('abierto_at', end.toISOString())
    .order('abierto_at', { ascending: false });

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
