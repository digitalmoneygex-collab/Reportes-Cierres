import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function readPaymentReceiptImage(base64Image: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Falta GEMINI_API_KEY');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analiza esta imagen de comprobante de pago venezolano. Extrae estos campos en JSON puro: {"monto_bs": number|null, "referencia": string|null, "banco_origen": string|null, "metodo": "pago_movil"|"transferencia"|"otro", "telefono_emisor": string|null, "observaciones": string|null}. Si no encuentras un campo, usa null. Responde solo JSON.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
  });

  const text = result.response.text();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
