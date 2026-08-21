import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─── Helpers: misma lógica de "día operativo" que el resto del sistema ────────
async function resolveBusinessDate(dateParam: string | null): Promise<string> {
  if (dateParam) return dateParam;

  // Leer start_time desde configuracion (igual que pskloud/resumen)
  const { data: config } = await supabaseAdmin
    .from('configuracion')
    .select('start_time')
    .eq('id', 1)
    .single();

  const startTime = config?.start_time ?? '06:00';
  const [sh, sm]  = startTime.split(':').map(Number);

  const now    = new Date();
  const vzDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
  const curMin = vzDate.getHours() * 60 + vzDate.getMinutes();
  const rstMin = (sh ?? 6) * 60 + (sm ?? 0);

  // Si estamos antes del reset (ej. 05:30 < 06:00) → el día operativo sigue siendo ayer
  if (curMin < rstMin) {
    vzDate.setDate(vzDate.getDate() - 1);
  }

  const y = vzDate.getFullYear();
  const m = String(vzDate.getMonth() + 1).padStart(2, '0');
  const d = String(vzDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/conciliacion?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = await resolveBusinessDate(dateParam);

    const { data, error } = await supabaseAdmin
      .from('pskloud_facturas')
      .select('*')
      .eq('fecha', targetDate)
      .order('documento', { ascending: true });

    if (error) {
      // Si la tabla no existe aún, devolver mensaje claro
      if (error.code === '42P01') {
        return NextResponse.json({
          ok: false,
          noTable: true,
          error: 'La tabla pskloud_facturas no existe aún. Ejecútala en Supabase SQL Editor.',
        }, { status: 503 });
      }
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
