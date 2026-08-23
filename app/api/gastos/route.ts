import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTasaDelDia } from '@/lib/tasa';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const abierto_at = searchParams.get('abierto_at');
    const cerrado_at = searchParams.get('cerrado_at');
    
    let start: Date;
    let end: Date;

    if (abierto_at) {
      start = new Date(abierto_at);
      end = cerrado_at ? new Date(cerrado_at) : new Date();
    } else if (dateParam) {
      start = new Date(`${dateParam}T00:00:00.000-04:00`);
      end = new Date(`${dateParam}T23:59:59.999-04:00`);
    } else {
      // Usar hoy
      const vzDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      const y = vzDate.getFullYear();
      const m = String(vzDate.getMonth() + 1).padStart(2, '0');
      const d = String(vzDate.getDate()).padStart(2, '0');
      start = new Date(`${y}-${m}-${d}T00:00:00.000-04:00`);
      end = new Date(`${y}-${m}-${d}T23:59:59.999-04:00`);
    }

    const { data, error } = await supabaseAdmin
      .from('otros_gastos')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { descripcion, moneda, monto, turno_id, referencia } = body;
    
    if (!descripcion || !moneda || !monto) {
      return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const tasa = await getTasaDelDia(false);
    if (!tasa || tasa <= 0) {
      return NextResponse.json({ ok: false, error: 'Tasa BCV inválida' }, { status: 400 });
    }

    let monto_bs = 0;
    let monto_usd = 0;
    const numMonto = Number(monto);

    if (moneda === 'BS') {
      monto_bs = numMonto;
      monto_usd = numMonto / tasa;
    } else {
      monto_usd = numMonto;
      monto_bs = numMonto * tasa;
    }

    const { data, error } = await supabaseAdmin
      .from('otros_gastos')
      .insert({
        descripcion,
        referencia: referencia || null,
        moneda,
        monto_bs: Number(monto_bs.toFixed(2)),
        monto_usd: Number(monto_usd.toFixed(2)),
        tasa_aplicada: tasa,
        turno_id: turno_id || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ ok: false, error: 'Falta ID' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('otros_gastos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
