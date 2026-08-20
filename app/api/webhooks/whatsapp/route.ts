import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readPaymentReceiptImage } from '@/lib/gemini';
import { getTasaDelDia } from '@/lib/tasa';

const EVOLUTION_URL = (process.env.SERVER_URL ?? 'http://144.126.129.154:8081').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

// ─── Venezuela Time Helper ────────────────────────────────────────────────────
// Venezuela = UTC-4, sin horario de verano (America/Caracas)
function toVenezuelaTime(date: Date): { h: number; m: number } {
  const vzDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
  return { h: vzDate.getHours(), m: vzDate.getMinutes() };
}

function parseHHMM(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function toMinutes({ h, m }: { h: number; m: number }): number {
  return h * 60 + m;
}

function isWithinVenezuelaTimeRange(
  msgDate: Date,
  startTime: string, // "06:00"
  endTime: string    // "00:00" means end of day (midnight)
): boolean {
  const current = toMinutes(toVenezuelaTime(msgDate));
  const start   = toMinutes(parseHHMM(startTime));
  // "00:00" end means medianoche = 1440 min (end of day)
  const endParsed = parseHHMM(endTime);
  const end = endParsed.h === 0 && endParsed.m === 0 ? 1440 : toMinutes(endParsed);

  if (start <= end) {
    return current >= start && current <= end;
  }
  // Rango que cruza medianoche (ej. 22:00 → 06:00)
  return current >= start || current <= end;
}

// ─── Duplicate Check ──────────────────────────────────────────────────────────
async function findDuplicateByMessageId(messageId: string) {
  const { data } = await supabaseAdmin
    .from('pagos_whatsapp')
    .select('id, referencia')
    .eq('message_id', messageId)
    .maybeSingle();
  return data;
}

async function findDuplicateByReferencia(referencia: string) {
  if (!referencia || referencia === 'SIN REF') return null;
  // Buscar misma referencia en las últimas 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('pagos_whatsapp')
    .select('id')
    .eq('referencia', referencia)
    .eq('es_duplicado', false)
    .gte('created_at', since)
    .maybeSingle();
  return data;
}

// ─── Main Webhook ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const eventName = (payload.event || '').toLowerCase();
    if (!eventName.includes('messages') || !eventName.includes('upsert')) {
      return NextResponse.json({ ok: true, ignored: `Evento ignorado: ${payload.event}` });
    }

    // Evolution v2 puede envolver el mensaje en data o directamente
    const msgData = payload.data ?? payload;
    if (!msgData?.message && !msgData?.messages?.[0]) {
      return NextResponse.json({ ok: true, ignored: 'Sin mensaje en el payload' });
    }

    // Normalizar el mensaje (puede venir solo o en array)
    const msgItem        = msgData.messages?.[0] ?? msgData;
    const remoteJid      = msgItem.key?.remoteJid  ?? msgData.key?.remoteJid  ?? '';
    const remoteJidAlt   = msgItem.key?.remoteJidAlt ?? msgData.key?.remoteJidAlt ?? '';
    const isFromMe       = msgItem.key?.fromMe      ?? msgData.key?.fromMe      ?? false;
    const messageId      = msgItem.key?.id          ?? msgData.key?.id          ?? '';
    const instanceName   = payload.instance;
    const messageContent = msgItem.message          ?? msgData.message;
    // timestamp puede venir en segundos (epoch) o milisegundos
    const rawTs          = msgItem.messageTimestamp ?? msgData.messageTimestamp ?? Date.now() / 1000;
    const msgDate        = new Date(rawTs < 1e12 ? rawTs * 1000 : rawTs);

    // 1. Configuración desde Supabase
    const { data: config, error: cfgError } = await supabaseAdmin
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (cfgError || !config) {
      console.error('Webhook: No se pudo cargar configuracion', cfgError);
      return NextResponse.json({ ok: false, error: 'Sin configuracion' });
    }

    const receptor = config.numero_receptor || '';
    if (!receptor) {
      return NextResponse.json({ ok: true, ignored: 'No hay número receptor configurado' });
    }

    // 2. Filtro de intersección Maestro-Esclavo
    // (Solo procesar si el mensaje involucra al número receptor configurado)
    const cleanReceptor = receptor.replace(/\D/g, '');
    const combinedJid = remoteJid + remoteJidAlt;
    
    if (cleanReceptor && !combinedJid.includes(cleanReceptor)) {
       return NextResponse.json({ ok: true, ignored: 'Fuera de intersección (Receptor no coincide)' });
    }

    // Ignorar mensajes enviados por el bot (evitar bucles)
    if (isFromMe) {
      return NextResponse.json({ ok: true, ignored: 'Mensaje enviado por el bot' });
    }

    // 3. Filtro de zona horaria Venezuela
    if (!isWithinVenezuelaTimeRange(msgDate, config.start_time, config.end_time)) {
      const vzTime = toVenezuelaTime(msgDate);
      return NextResponse.json({
        ok: true,
        ignored: `Fuera del rango horario VZ (${vzTime.h.toString().padStart(2,'0')}:${vzTime.m.toString().padStart(2,'0')})`
      });
    }

    // 4. Solo imágenes
    const isImage = !!messageContent?.imageMessage;
    if (!isImage) {
      return NextResponse.json({ ok: true, ignored: 'No es una imagen' });
    }

    // 5. Detección rápida de duplicado por message_id (antes de llamar a Gemini)
    if (messageId) {
      const existingById = await findDuplicateByMessageId(messageId);
      if (existingById) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          originalId: existingById.id,
          message: `Comprobante ya registrado (ref: ${existingById.referencia})`
        });
      }
    }

    // 6. Descargar imagen en Base64 desde Evolution API
    const downloadRes = await fetch(
      `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
        body: JSON.stringify({ message: msgItem.key ? msgItem : msgData })
      }
    );

    if (!downloadRes.ok) {
      console.error('Error descargando imagen:', await downloadRes.text());
      return NextResponse.json({ ok: false, error: 'Error al obtener base64' });
    }

    const dlJson = await downloadRes.json();
    const base64 = dlJson.base64 ?? dlJson.data?.base64 ?? '';
    if (!base64) {
      return NextResponse.json({ ok: false, error: 'Base64 vacío' });
    }

    // 7. OCR con Gemini
    let extractedData;
    try {
      extractedData = await readPaymentReceiptImage(base64);
    } catch (ocrError: unknown) {
      console.error('Error en Gemini OCR:', ocrError);
      return NextResponse.json({ ok: false, error: 'Fallo al procesar imagen con IA' });
    }

    // 8. Detección de duplicado por referencia bancaria (segunda capa)
    const referencia = extractedData.referencia || 'SIN REF';
    const existingByRef = await findDuplicateByReferencia(referencia);

    let tasa = 0;
    try {
      tasa = await getTasaDelDia(false);
    } catch (tasaErr) {
      console.error('Error obteniendo tasa BCV en webhook, usando 0:', tasaErr);
    }
    
    const monto_bs = extractedData.monto_bs || 0;
    const monto_usd = tasa > 0 ? (monto_bs / tasa).toFixed(2) : 0;

    if (existingByRef) {
      // Guardar como duplicado pero no contarlo
      await supabaseAdmin.from('pagos_whatsapp').insert({
        message_id:      messageId || null,
        telefono_emisor: remoteJid.split('@')[0], // Guardar el número del cliente real
        monto_bs,
        monto_usd:       Number(monto_usd),
        tasa_aplicada:   tasa,
        referencia,
        banco_origen:    extractedData.banco_origen || 'Desconocido',
        metodo:          extractedData.metodo       || 'otro',
        imagen_url:      null,
        procesado:       true,
        es_duplicado:    true,
        duplicado_de:    String(existingByRef.id)
      });
      return NextResponse.json({
        ok: true,
        duplicate: true,
        originalId: existingByRef.id,
        message: `⚠️ Duplicado detectado — referencia "${referencia}" ya registrada`
      });
    }

    // 9. Insertar pago válido
    const { error: dbError } = await supabaseAdmin.from('pagos_whatsapp').insert({
      message_id:      messageId || null,
      telefono_emisor: remoteJid.split('@')[0],
      monto_bs,
      monto_usd:       Number(monto_usd),
      tasa_aplicada:   tasa,
      referencia,
      banco_origen:    extractedData.banco_origen || 'Desconocido',
      metodo:          extractedData.metodo       || 'otro',
      imagen_url:      null,
      procesado:       true,
      es_duplicado:    false,
      duplicado_de:    null
    });

    if (dbError) {
      // Si falla por UNIQUE constraint en message_id, también es duplicado
      if (dbError.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true, message: 'message_id duplicado' });
      }
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
