import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function readPaymentReceipt(base64Image: string | null, textContent?: string | null) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Falta GEMINI_API_KEY');
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  // Add retry logic for 503 errors
  let result;
  let retries = 3;
  
  const rules = `REGLAS IMPORTANTES: (1) Si NO ves claramente un número de teléfono en la imagen/texto, devuelve "telefono_emisor": "0000000000" — NUNCA inventes ni supongas un teléfono. (2) Si es foto de pantalla, haz tu mejor esfuerzo por leer los datos. (3) Si no encuentras un campo, usa null excepto telefono_emisor que usa "0000000000". (4) Responde solo JSON sin formato markdown adicional.`;

  let parts: any[] = [];

  if (base64Image) {
    parts = [
      {
        text: `Analiza esta imagen de comprobante de pago venezolano (puede ser un screenshot o una foto de una pantalla). Extrae estos campos en JSON puro: {"monto_bs": number|null, "referencia": string|null, "banco_origen": string|null, "metodo": "pago_movil"|"transferencia"|"otro", "telefono_emisor": string|null, "observaciones": string|null}. ${rules}`
      },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ];
  } else if (textContent) {
    parts = [
      {
        text: `Analiza este texto que corresponde a un comprobante de pago venezolano (por ejemplo, un SMS o mensaje de confirmación de banco). Extrae estos campos en JSON puro: {"monto_bs": number|null, "referencia": string|null, "banco_origen": string|null, "metodo": "pago_movil"|"transferencia"|"otro", "telefono_emisor": string|null, "observaciones": string|null}. Texto del mensaje:\n\n${textContent}\n\n${rules}`
      }
    ];
  } else {
    throw new Error('Debe proporcionar una imagen o un texto');
  }

  while (retries > 0) {
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts }]
      });
      break; // Success, exit loop
    } catch (error: any) {
      const errMsg = error.message || '';
      console.error(`Gemini API Error: ${errMsg}`);
      
      // If it's a Rate Limit (429), wait 15 seconds and try again. 
      // If it's exhausted, it will fail on the last retry.
      const isRateLimit = errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('Quota exceeded');
      const isOverloaded = errMsg.includes('503') || errMsg.includes('Service Unavailable') || errMsg.includes('overloaded');

      retries--;
      if (retries === 0) {
        if (isRateLimit) {
          throw new Error(`[RATE_LIMIT] Límite gratuito de Gemini alcanzado (15 por minuto). Espera 1 minuto y vuelve a intentarlo.`);
        }
        throw new Error(`Error en OCR después de 3 intentos: ${errMsg}`);
      }

      // Wait before retrying
      if (isRateLimit) {
        console.log('[RATE LIMIT] Waiting 15s before retry...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      } else if (isOverloaded) {
        console.log('[503 OVERLOADED] Waiting 5s before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  if (!result) {
    throw new Error('No se pudo obtener respuesta del modelo Gemini.');
  }

  const text = result.response.text();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
