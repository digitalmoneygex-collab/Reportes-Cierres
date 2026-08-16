import { NextRequest } from 'next/server';
import { readPaymentReceiptImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message) {
      return Response.json({ ok: false, reason: 'No message' }, { status: 400 });
    }

    const image = message?.image || message?.media?.image || message?.message?.image;
    const sender = message?.key?.remoteJid || message?.from || message?.sender;

    if (!image || !sender) {
      return Response.json({ ok: true, ignored: true }, { status: 200 });
    }

    const imageBase64 = image?.base64 || image?.data || image?.url || '';

    if (!imageBase64) {
      return Response.json({ ok: true, ignored: true }, { status: 200 });
    }

    const parsed = await readPaymentReceiptImage(imageBase64);

    const payload = {
      telefono_emisor: sender,
      monto_bs: parsed?.monto_bs ?? null,
      referencia: parsed?.referencia ?? null,
      banco_origen: parsed?.banco_origen ?? null,
      metodo: parsed?.metodo ?? 'otro',
      imagen_url: image?.url ?? null,
      procesado: true,
    };

    const { error } = await supabaseAdmin.from('pagos_whatsapp').insert(payload);

    if (error) {
      throw error;
    }

    return Response.json({ ok: true, payload, parsed }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error', error);
    return Response.json({ ok: false, message: error?.message ?? 'unknown' }, { status: 500 });
  }
}
