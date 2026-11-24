import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documento = searchParams.get('documento');
  const fecha = searchParams.get('fecha');

  if (!documento) {
    return NextResponse.json({ ok: false, error: 'Documento requerido' }, { status: 400 });
  }

  const queryDate = fecha ? fecha : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Descarga directa con service role (el conector sube el JSON con cacheControl=0)
    const { data: file, error } = await supabase.storage
      .from('detalles')
      .download(`${queryDate}.json`);

    if (error || !file) {
      return NextResponse.json({ ok: true, detalles: [], debug: 'descarga-fallo: ' + (error?.message ?? 'sin archivo') + ' fecha=' + queryDate }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const jsonText = await file.text();
    const detallesMap = JSON.parse(jsonText);

    // Se asegura de limpiar el documento por si trae espacios (como lo hace sync-pskloud.js)
    const docItems = detallesMap[documento.trim()] || [];
    
    return NextResponse.json({ ok: true, detalles: docItems, debug: docItems.length ? undefined : 'doc-no-encontrado: ' + documento + ' fecha=' + queryDate + ' docs=' + Object.keys(detallesMap).length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
