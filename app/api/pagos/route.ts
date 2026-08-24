import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date     = searchParams.get('date');     // YYYY-MM-DD
  const limit    = Math.min(Number(searchParams.get('limit') ?? '200'), 500);
  const banco    = searchParams.get('banco');
  const search   = searchParams.get('search');

  try {
    const abierto_at = searchParams.get('abierto_at');
    const cerrado_at = searchParams.get('cerrado_at');

    let start: Date;
    let end: Date;

    if (abierto_at) {
      start = new Date(abierto_at);
      end = cerrado_at ? new Date(cerrado_at) : new Date();
    } else if (date) {
      start = new Date(`${date}T00:00:00.000-04:00`);
      end = new Date(`${date}T23:59:59.999-04:00`);
    } else {
      // Usar la hora configurada (ej. 06:00) como límite del día lógico
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

    let query = supabaseAdmin
      .from('pagos_whatsapp')
      .select('*')
      .eq('es_duplicado', false)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (banco && banco !== 'Todos') {
      query = query.ilike('banco_origen', `%${banco}%`);
    }

    if (search) {
      query = query.or(
        `referencia.ilike.%${search}%,telefono_emisor.ilike.%${search}%,banco_origen.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [], count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { monto_bs, referencia, banco_origen, telefono_emisor, observaciones } = body;

    if (!monto_bs || !referencia || !banco_origen) {
      return NextResponse.json({ ok: false, error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const { error: insertErr } = await supabaseAdmin.from('pagos_whatsapp').insert({
      message_id: 'MANUAL-' + Date.now(),
      monto_bs,
      referencia,
      banco_origen,
      metodo: 'pago_movil',
      telefono_emisor: telefono_emisor || '0000000000',
      procesado: true,
      es_duplicado: false
    });

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Pago registrado' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/pagos
// Body: { id: string, auditoria_check: boolean }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, auditoria_check } = body;

    if (!id || auditoria_check === undefined) {
      return NextResponse.json({ ok: false, error: 'Faltan campos: id y auditoria_check' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('pagos_whatsapp')
      .update({ auditoria_check })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Check actualizado' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/pagos
// URL query: ?id=string
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Falta ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('pagos_whatsapp')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
