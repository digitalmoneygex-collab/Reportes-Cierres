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
    let start: Date;
    let end: Date;

    if (date) {
      start = new Date(`${date}T00:00:00`);
      end   = new Date(`${date}T23:59:59.999`);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end   = new Date();
      end.setHours(23, 59, 59, 999);
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
