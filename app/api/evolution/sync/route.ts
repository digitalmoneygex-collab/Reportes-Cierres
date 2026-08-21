import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readPaymentReceipt } from '@/lib/gemini';
import { getTasaDelDia } from '@/lib/tasa';

const EVOLUTION_URL = (process.env.SERVER_URL ?? 'http://144.126.129.154:8081').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

function toVenezuelaTime(date: Date): { h: number; m: number } {
  const vzDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
  return { h: vzDate.getHours(), m: vzDate.getMinutes() };
}
function parseHHMM(t: string) { const [h, m] = t.split(':').map(Number); return { h: h ?? 0, m: m ?? 0 }; }
function toMin({ h, m }: { h: number; m: number }) { return h * 60 + m; }
function inRange(date: Date, start: string, end: string): boolean {
  const cur = toMin(toVenezuelaTime(date));
  const s   = toMin(parseHHMM(start));
  const ep  = parseHHMM(end);
  const e   = ep.h === 0 && ep.m === 0 ? 1440 : toMin(ep);
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
}

export async function POST(request: Request) {
  try {
    // 1. Cargar configuración
    const { data: config } = await supabaseAdmin.from('configuracion').select('*').eq('id', 1).single();
    if (!config) return NextResponse.json({ ok: false, error: 'Sin configuracion' });

    const instanceName   = config.instance_name ?? 'mi_bot';
    const cleanReceptor  = (config.numero_receptor || '').replace(/\D/g, '');
    const startTime      = config.start_time ?? '06:00';
    const endTime        = config.end_time ?? '00:00';

    if (!cleanReceptor) return NextResponse.json({ ok: false, error: 'Sin número receptor' });

    // 2. Obtener mensajes recientes (sin filtro where para no perder los @lid)
    const fetchRes = await fetch(
      `${EVOLUTION_URL}/chat/findMessages/${instanceName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
        body: JSON.stringify({ where: {}, limit: 1000, take: 1000 }) // Trae más mensajes para no perder los del principio del día
      }
    );

    if (!fetchRes.ok) {
      const text = await fetchRes.text();
      return NextResponse.json({ ok: false, error: `Evolution error: ${text.slice(0, 200)}` });
    }

    type EvolutionMsg = {
      key: { id: string; remoteJid: string; remoteJidAlt?: string; fromMe: boolean };
      message: Record<string, unknown>;
      messageTimestamp: number;
    };
    const responseData = await fetchRes.json();
    // En Evolution v2.3.7, la respuesta de findMessages sin JID es { messages: { records: [...] } }
    const messages: EvolutionMsg[] = responseData.messages?.records || responseData.records || responseData || [];
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: 'Respuesta inválida o vacía de Evolution API' });
    }

    // 3. Verificar última sincronización del día (smart sync: no reprocesar desde cero)
    const todayVZ = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    const todayStart = new Date(`${todayVZ}T00:00:00.000-04:00`);

    const { data: lastRecord } = await supabaseAdmin
      .from('pagos_whatsapp')
      .select('created_at, message_id')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Si ya hay registros del día, solo procesar mensajes POSTERIORES al último
    const lastSyncedAt = lastRecord?.created_at ? new Date(lastRecord.created_at) : null;
    if (lastSyncedAt) {
      console.log(`[Sync] Úlitma sync: ${lastSyncedAt.toISOString()} — procesando solo mensajes nuevos`);
    } else {
      console.log(`[Sync] Sin registros previos hoy — procesando todo el día`);
    }

    // 4. Filtrar: imágenes o textos (comprobantes), dentro del rango horario Venezuela y del receptor
    const eligible = messages.filter(msg => {
      const jid = (msg.key.remoteJid || '') + (msg.key.remoteJidAlt || '');
      if (cleanReceptor && !jid.includes(cleanReceptor)) return false;
      
      const isImage = !!msg.message?.imageMessage;
      const textMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const textLower = textMsg.toLowerCase();
      const isReceiptText = !isImage && textMsg && (
        (textLower.includes('referencia') || textLower.includes('ref')) && 
        (textLower.includes('monto') || textLower.includes('bs'))
      );

      if (!isImage && !isReceiptText) return false;

      const rawTs = msg.messageTimestamp;
      const msgDate = new Date(rawTs < 1e12 ? rawTs * 1000 : rawTs);
      // Solo mensajes de hoy en Venezuela
      const msgDayVZ = msgDate.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
      if (msgDayVZ !== todayVZ) return false;
      // Smart sync: si ya hay datos previos, solo procesar mensajes posteriores al último
      if (lastSyncedAt && msgDate <= lastSyncedAt) return false;
      return inRange(msgDate, startTime, endTime);
    });

    let procesados = 0;
    let duplicados = 0;
    let errores    = 0;
    const errorDetails: string[] = [];

    for (const msg of eligible) {
      const messageId = msg.key.id;

      // Skip si ya existe en BD
      const { data: existing } = await supabaseAdmin
        .from('pagos_whatsapp')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle();
      if (existing) { duplicados++; continue; }

      const isImage = !!msg.message?.imageMessage;
      const textMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      // Descargar imagen solo si es imagen
      let base64 = null;
      if (isImage) {
        const dlRes = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
          body: JSON.stringify({ message: msg })
        });
        if (!dlRes.ok) { 
          errores++; 
          errorDetails.push(`Evolution HTTP ${dlRes.status}: ${await dlRes.text()}`);
          continue; 
        }
        const dlJson = await dlRes.json();
        base64 = dlJson.base64 ?? dlJson.data?.base64 ?? '';
        if (!base64) { 
          errores++; 
          errorDetails.push(`No base64 returned by Evolution`);
          continue; 
        }
      }

      // OCR o extracción
      let extractedData;
      try { 
        extractedData = await readPaymentReceipt(base64, !isImage ? textMsg : null); 
      }
      catch (err: any) { 
        errores++; 
        errorDetails.push(`OCR Error: ${err.message}`);
        continue; 
      }

      const referencia = extractedData.referencia || 'SIN REF';

      // Check duplicado por referencia (dentro del día Venezuela)
      const now = new Date();
      const tzDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const [m, d, y] = tzDate.split('/');
      const since = new Date(`${y}-${m}-${d}T00:00:00.000-04:00`);
      const { data: refDup } = await supabaseAdmin
        .from('pagos_whatsapp')
        .select('id')
        .eq('referencia', referencia)
        .eq('es_duplicado', false)
        .gte('created_at', since.toISOString())
        .maybeSingle();

      const esDup = !!refDup;

      // Calcular monto en dólares si la tasa es mayor a 0
      const tasa = await getTasaDelDia(false);
      const monto_bs = extractedData.monto_bs || 0;
      const monto_usd = tasa > 0 ? (monto_bs / tasa).toFixed(2) : 0;

      await supabaseAdmin.from('pagos_whatsapp').insert({
        message_id:      messageId,
        telefono_emisor: extractedData.telefono_emisor || '0000000000', // OCR: '0000000000' si no aparece en la imagen
        monto_bs,
        monto_usd:       Number(monto_usd),
        tasa_aplicada:   tasa,
        referencia,
        banco_origen:    extractedData.banco_origen || 'Desconocido',
        metodo:          extractedData.metodo || 'otro',
        imagen_url:      null,
        procesado:       true,
        es_duplicado:    esDup,
        duplicado_de:    esDup ? String(refDup!.id) : null
      });

      if (esDup) duplicados++; else procesados++;
    }

    return NextResponse.json({
      ok: true,
      resumen: { total: eligible.length, procesados, duplicados, errores },
      lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
      smartSync: !!lastSyncedAt,
      errorDetails
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
