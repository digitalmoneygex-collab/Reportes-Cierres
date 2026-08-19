import { NextResponse } from 'next/server';

const EVOLUTION_URL = (process.env.SERVER_URL ?? 'http://144.126.129.154:8081').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance') ?? 'mi_bot';

  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instance}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: `Evolution HTTP ${res.status}: ${text.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json() as Record<string, unknown>;
    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
