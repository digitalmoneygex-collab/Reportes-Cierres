import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documento = searchParams.get('documento');
  const fecha = searchParams.get('fecha');

  if (!documento) {
    return NextResponse.json({ ok: false, error: 'Documento requerido' }, { status: 400 });
  }

  const queryDate = fecha ? fecha : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // Endpoint autenticado directo con cache-buster (?bust=) para evitar caché de Next.js y CDN
    const url = `${supabaseUrl}/storage/v1/object/authenticated/detalles/${encodeURIComponent(queryDate)}.json?bust=${Date.now()}`;
    const resp = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Cache-Control': 'no-cache, no-store',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return NextResponse.json(
        { ok: true, detalles: [], debug: `storage-${resp.status} fecha=${queryDate}` },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const detallesMap = await resp.json();
    const docItems = detallesMap[documento.trim()] || [];

    return NextResponse.json(
      {
        ok: true,
        detalles: docItems,
        debug: docItems.length
          ? undefined
          : `doc-no-encontrado: ${documento} fecha=${queryDate} docs=${Object.keys(detallesMap).length}`,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
