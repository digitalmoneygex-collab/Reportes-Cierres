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

  // Buscar turno activo global
  let query = supabase
    .from('turnos')
    .select('*, usuario:usuarios(rol)')
    .is('cerrado_at', null)
    .order('abierto_at', { ascending: false })
    .limit(1);

  const { data: turnoActivo } = await query.maybeSingle();

  if (turnoActivo) {
    // Si el turno lo abrió un SUPERVISOR y el usuario logueado NO lo es, queda bloqueado.
    if (perfil?.rol !== 'SUPERVISOR' && turnoActivo.usuario?.rol === 'SUPERVISOR') {
      return NextResponse.json({ 
        ok: true, 
        active: false, 
        blockedBySupervisor: true, 
        perfil 
      });
    }

    return NextResponse.json({ 
      ok: true, 
      active: true, 
      turno: turnoActivo,
      perfil 
    });
  }

  return NextResponse.json({ ok: true, active: false, blockedBySupervisor: false, perfil });
}

export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch(e){}
  const { hora_inicio } = body;

  let abierto_at = new Date();

  if (hora_inicio) {
    const now = new Date();
    const vzDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const [h, m] = hora_inicio.split(':').map(Number);
    
    const y = vzDate.getFullYear();
    const mo = String(vzDate.getMonth() + 1).padStart(2, '0');
    const d = String(vzDate.getDate()).padStart(2, '0');
    
    const isoString = `${y}-${mo}-${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000-04:00`;
    let requestedStart = new Date(isoString);

    if (requestedStart < new Date()) {
       // Verificar que las facturas desde requestedStart en adelante no estén contabilizadas
       const { data: facturasProcessed } = await supabase
         .from('pskloud_facturas')
         .select('fechayhora')
         .eq('procesado', true)
         .gte('fechayhora', requestedStart.toISOString())
         .order('fechayhora', { ascending: false })
         .limit(1);

       if (facturasProcessed && facturasProcessed.length > 0) {
         // Si hay facturas procesadas, adelantamos la hora justo después de la última procesada
         // para atrapar solo las "huérfanas" posteriores
         const lastProcessedTime = new Date(facturasProcessed[0].fechayhora);
         requestedStart = new Date(lastProcessedTime.getTime() + 1000);
       }
       abierto_at = requestedStart;
    }
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
    .select('*, usuario:usuarios(rol)')
    .is('cerrado_at', null)
    .order('abierto_at', { ascending: false })
    .limit(1);

  const { data: turnoActivo } = await query.maybeSingle();

  if (!turnoActivo) return NextResponse.json({ ok: false, error: 'No hay turno activo' }, { status: 400 });

  // Seguridad: Un cajero no puede cerrar el turno de un supervisor
  if (perfil?.rol !== 'SUPERVISOR' && turnoActivo.usuario?.rol === 'SUPERVISOR') {
    return NextResponse.json({ ok: false, error: 'No tienes permiso para cerrar el turno de un supervisor' }, { status: 403 });
  }

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
