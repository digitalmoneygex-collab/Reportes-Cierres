import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readPaymentReceiptImage } from '@/lib/gemini';

const EVOLUTION_URL = (process.env.SERVER_URL ?? 'http://144.126.129.154:8081').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Solo procesamos eventos de nuevos mensajes
    if (payload.event !== 'messages.upsert' || !payload.data?.message) {
      return NextResponse.json({ ok: true, ignored: 'No es un mensaje nuevo' });
    }

    const msgData = payload.data;
    const remoteJid = msgData.key?.remoteJid || '';
    const isFromMe = msgData.key?.fromMe || false;
    const instanceName = payload.instance;

    // 1. Obtener la configuración de Supabase
    const { data: config, error: cfgError } = await supabaseAdmin
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (cfgError || !config) {
      console.error('Webhook: No se pudo cargar la configuracion', cfgError);
      return NextResponse.json({ ok: false, error: 'Sin configuracion' });
    }

    const receptor = config.numero_receptor || '';
    if (!receptor) {
      return NextResponse.json({ ok: true, ignored: 'No hay número receptor configurado' });
    }

    // 2. Intersección (Filtro Maestro-Esclavo)
    // Extraemos solo los dígitos del receptor configurado
    const cleanReceptor = receptor.replace(/\D/g, '');
    
    // Si el remoteJid no contiene el número del receptor, lo ignoramos.
    // Esto garantiza que solo se procesen mensajes intercambiados con ese número específico.
    if (!remoteJid.includes(cleanReceptor)) {
      return NextResponse.json({ ok: true, ignored: 'Mensaje fuera de la intersección permitida' });
    }

    // Opcional: ignorar mensajes enviados por el propio bot para evitar bucles
    if (isFromMe) {
      return NextResponse.json({ ok: true, ignored: 'Mensaje enviado por el bot' });
    }

    // 3. Verificar si es una imagen
    const messageContent = msgData.message;
    const isImage = !!messageContent?.imageMessage;
    
    if (!isImage) {
      return NextResponse.json({ ok: true, ignored: 'No es una imagen' });
    }

    // 4. Descargar la imagen en Base64 desde Evolution API
    const downloadRes = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_KEY
      },
      body: JSON.stringify({ message: msgData })
    });

    if (!downloadRes.ok) {
      console.error('Error descargando imagen:', await downloadRes.text());
      return NextResponse.json({ ok: false, error: 'Error al obtener base64' });
    }

    const { base64 } = await downloadRes.json();
    if (!base64) {
      return NextResponse.json({ ok: false, error: 'Base64 vacío' });
    }

    // 5. Procesar con Gemini (OCR)
    let extractedData;
    try {
      extractedData = await readPaymentReceiptImage(base64);
    } catch (ocrError: any) {
      console.error('Error en Gemini OCR:', ocrError);
      return NextResponse.json({ ok: false, error: 'Fallo al procesar imagen con IA' });
    }

    // 6. Guardar en Base de Datos (Supabase)
    const { error: dbError } = await supabaseAdmin.from('pagos_whatsapp').insert({
      telefono_emisor: remoteJid.split('@')[0],
      monto_bs: extractedData.monto_bs || 0,
      referencia: extractedData.referencia || 'SIN REF',
      banco_origen: extractedData.banco_origen || 'Desconocido',
      metodo: extractedData.metodo || 'otro',
      imagen_url: null, // Podría subirse a un bucket si se desea guardar
      procesado: true
    });

    if (dbError) {
      console.error('Error insertando en BD:', dbError);
      return NextResponse.json({ ok: false, error: 'Fallo al guardar en BD' });
    }

    return NextResponse.json({ ok: true, processed: true, data: extractedData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error general en webhook:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
