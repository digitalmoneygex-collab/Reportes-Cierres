import { NextRequest } from 'next/server';

function normalizeServerUrl(value: string) {
  return (value || '').replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instanceName = searchParams.get('instanceName') || process.env.EVOLUTION_INSTANCE_NAME || '';
  const serverUrl = process.env.SERVER_URL || '';
  const apiKey = process.env.EVOLUTION_API_KEY || '';

  if (!serverUrl || !apiKey) {
    return Response.json(
      {
        ok: false,
        reason: 'Faltan SERVER_URL o EVOLUTION_API_KEY en el entorno.',
      },
      { status: 500 }
    );
  }

  if (!instanceName) {
    return Response.json(
      {
        ok: false,
        reason: 'Falta el nombre de la instancia de Evolution. Pásalo en ?instanceName=... o define EVOLUTION_INSTANCE_NAME.',
      },
      { status: 400 }
    );
  }

  const url = `${normalizeServerUrl(serverUrl)}/instance/connectionState/${encodeURIComponent(instanceName)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });

    const rawText = await res.text();
    let payload: any = rawText;

    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          reason: typeof payload === 'string' ? payload : payload?.message || payload?.error || 'Evolution respondió con error.',
          status: res.status,
          url,
          payload,
        },
        { status: res.status }
      );
    }

    return Response.json(
      {
        ok: true,
        status: payload?.state || payload?.connectionState || payload?.status || 'connected',
        instanceName,
        url,
        payload,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        reason: error?.message || 'No se pudo conectar con Evolution.',
        url,
      },
      { status: 500 }
    );
  }
}
