import { NextResponse } from 'next/server';
import { insertStressTestRows } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({ total: 25 }));
    const total = Number(body?.total ?? 25);
    const result = await insertStressTestRows(total);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, reason: error?.message || 'Unknown error' }, { status: 500 });
  }
}
