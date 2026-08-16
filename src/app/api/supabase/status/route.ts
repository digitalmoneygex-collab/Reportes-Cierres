import { NextResponse } from 'next/server';
import { getSupabaseStatus } from '@/lib/supabase';

export async function GET() {
  try {
    const result = await getSupabaseStatus();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, reason: error?.message || 'Unknown error' }, { status: 500 });
  }
}
