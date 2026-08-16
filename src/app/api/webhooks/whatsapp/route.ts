import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload || !payload.message) {
      return Response.json({ ok: false, reason: 'No message' }, { status: 400 });
    }

    const msg = payload.message;
    const sender = msg.key?.remoteJid || msg.from || msg.sender;
    const imageData = msg.image?.base64 || msg.image?.data || msg.media?.image?.base64 || msg.media?.image?.data;

    if (!sender || !imageData) {
      return Response.json({ ok: true, ignored: true }, { status: 200 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analiza esta imagen de comprobante de pago venezolano. Devuelve solo JSON con este formato: {"monto_bs": number|null, "referencia": string|null, "banco_origen": string|null, "metodo": "pago_movil"|"transferencia"|"otro", "telefono_emisor": string|null, "observaciones": string|null}. Si no encuentras datos, usa null.`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageData,
              },
            },
          ],
        },
      ],
    });

    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    const record = {
      telefono_emisor: sender,
      monto_bs: parsed?.monto_bs ?? null,
      referencia: parsed?.referencia ?? null,
      banco_origen: parsed?.banco_origen ?? null,
      metodo: parsed?.metodo ?? 'otro',
      imagen_url: payload?.message?.image?.url ?? null,
      procesado: true,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('pagos_whatsapp').insert(record);

    if (error) {
      throw error;
    }

    return Response.json({ ok: true, record, parsed }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return Response.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
