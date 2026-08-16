import { NextRequest } from 'next/server';

function normalizeServerUrl(value: string) {
  return (value || '').replace(/\/+$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const instanceName = body?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'reportes-cierres';
    const serverUrl = process.env.SERVER_URL || '';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    if (!serverUrl || !apiKey) {
      return Response.json({ ok: false, reason: 'Faltan SERVER_URL o EVOLUTION_API_KEY' }, { status: 500 });
    }

    const url = `${normalizeServerUrl(serverUrl)}/instance/create`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        instanceName,
        token: body?.token || instanceName,
        qrcode: true,
        webhook: body?.webhook || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/whatsapp`,
      }),
      cache: 'no-store',
    });

    const text = await res.text();
    let payload: any = text;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          reason: typeof payload === 'string' ? payload : payload?.message || payload?.error || 'No se pudo crear la instancia de Evolution.',
          status: res.status,
          payload,
        },
        { status: res.status }
      );
    }

    return Response.json({
      ok: true,
      instanceName,
      status: payload?.state || payload?.status || 'created',
      payload,
    });
  } catch (error: any) {
    return Response.json({ ok: false, reason: error?.message || 'Error creando la instancia en Evolution.' }, { status: 500 });
  }
}
