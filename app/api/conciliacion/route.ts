import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/conciliacion?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Si no viene date, usar hoy en Venezuela
    let targetDate = date;
    if (!targetDate) {
      targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    }

    const { data, error } = await supabaseAdmin
      .from('pskloud_facturas')
      .select('*')
      .eq('fecha', targetDate)
      .order('documento', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fecha: targetDate, facturas: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/conciliacion
// Body: { id: string, metodo_pago: string }
// Procesa una factura: la marca como procesada e inmutable
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, metodo_pago } = body;

    if (!id || !metodo_pago) {
      return NextResponse.json({ ok: false, error: 'Faltan campos: id y metodo_pago' }, { status: 400 });
    }

    // Verificar que no esté ya procesada
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('pskloud_facturas')
      .select('procesado')
      .eq('id', id)
      .single();

    if (checkErr || !existing) {
      return NextResponse.json({ ok: false, error: 'Factura no encontrada' }, { status: 404 });
    }

    if (existing.procesado) {
      return NextResponse.json({ ok: false, error: 'Esta factura ya fue procesada y no puede modificarse' }, { status: 409 });
    }

    // Marcar como procesada
    const { error: updateErr } = await supabaseAdmin
      .from('pskloud_facturas')
      .update({
        metodo_pago,
        procesado: true,
        procesado_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Factura procesada correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
