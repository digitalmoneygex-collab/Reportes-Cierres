import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        ok: true,
        data: {
          startTime: '06:00',
          endTime: '00:00',
          webhookUrl: 'https://reportes-cierres.psi.vercel.app/api/webhooks/whatsapp',
          instanceName: 'mi_bot',
          numeroReceptor: ''
        }
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        startTime: data.start_time,
        endTime: data.end_time,
        webhookUrl: data.webhook_url,
        instanceName: data.instance_name,
        numeroReceptor: data.numero_receptor
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startTime, endTime, webhookUrl, instanceName, numeroReceptor } = body;

    const { error } = await supabaseAdmin
      .from('configuracion')
      .upsert({
        id: 1,
        start_time: startTime,
        end_time: endTime,
        webhook_url: webhookUrl,
        instance_name: instanceName,
        numero_receptor: numeroReceptor
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
