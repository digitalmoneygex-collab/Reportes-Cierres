# Módulo de comprobantes por WhatsApp

## Flujo

1. El número master A conecta Evolution API.
2. El número destino B recibe los comprobantes de pago.
3. Evolution envía el mensaje al webhook de la API.
4. El backend recibe la imagen y la procesa con Gemini.
5. El resultado se guarda en la tabla `pagos_whatsapp` de Supabase.

## Endpoint

- POST /api/webhooks/whatsapp

## Variables requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

## Tabla recomendada en Supabase

```sql
CREATE TABLE public.pagos_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id UUID REFERENCES public.cierres_diarios(id) ON DELETE SET NULL,
  telefono_emisor VARCHAR(30),
  monto_bs NUMERIC(12,2),
  referencia VARCHAR(50),
  banco_origen VARCHAR(50),
  metodo VARCHAR(20),
  imagen_url TEXT,
  procesado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Prueba manual

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "key": { "remoteJid": "584141234567@s.whatsapp.net" },
      "image": { "base64": "..." }
    }
  }'
```
