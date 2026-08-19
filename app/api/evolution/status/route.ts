import { NextResponse } from 'next/server';

const EVOLUTION_URL = (process.env.SERVER_URL ?? 'http://144.126.129.154:8081').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

export async function GET() {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Evolution HTTP ${res.status}` }, { status: res.status });
    }

    const instances = await res.json();
    return NextResponse.json({ ok: true, instances: Array.isArray(instances) ? instances : [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg, instances: [] }, { status: 500 });
  }
}
