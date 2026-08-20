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
          numeroReceptor: '',
          cotizaveApiKey: '',
          horario1: '06:00',
          horario2: '12:00',
          horario3: '18:00',
          tasaDolar: 0,
          ultimaActualizacionTasa: null
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
        numeroReceptor: data.numero_receptor,
        cotizaveApiKey: data.cotizave_api_key,
        horario1: data.horario_1,
        horario2: data.horario_2,
        horario3: data.horario_3,
        tasaDolar: data.tasa_dolar,
        ultimaActualizacionTasa: data.ultima_actualizacion_tasa
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
    const updateData: any = { id: 1 };
    
    if (body.startTime !== undefined) updateData.start_time = body.startTime;
    if (body.endTime !== undefined) updateData.end_time = body.endTime;
    if (body.webhookUrl !== undefined) updateData.webhook_url = body.webhookUrl;
    if (body.instanceName !== undefined) updateData.instance_name = body.instanceName;
    if (body.numeroReceptor !== undefined) updateData.numero_receptor = body.numeroReceptor;
    
    if (body.cotizaveApiKey !== undefined) updateData.cotizave_api_key = body.cotizaveApiKey;
    if (body.horario1 !== undefined) updateData.horario_1 = body.horario1;
    if (body.horario2 !== undefined) updateData.horario_2 = body.horario2;
    if (body.horario3 !== undefined) updateData.horario_3 = body.horario3;

    const { error } = await supabaseAdmin
      .from('configuracion')
      .upsert(updateData);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
