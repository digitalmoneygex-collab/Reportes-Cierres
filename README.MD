# Sistema de Cierres Diarios y Control de Caja

Este repositorio queda como base de infraestructura para desplegar localmente un entorno con Evolution API + PostgreSQL y dejar preparado el acceso a Supabase para la aplicación web de cierres de caja.

## Estado del Proyecto y Progreso (Log)

**✅ Lo que está completado:**
- **Infraestructura de Evolution API**: Configuración de Docker (Postgres, Redis, Evolution API v2.1.1) rediseñada, funcional y estable en la VPS.
- **Migración a App Router**: Se estructuró el código de Next.js en la carpeta `app/` de forma definitiva.
- **Autenticación (Supabase)**: Rutas `/api/auth/login`, protección con `middleware.ts` y UI de login completadas.
- **Dashboard y Conexión WA**: Interfaz en tiempo real conectada al estado de Evolution API (`/api/evolution/status`) y vista de base de datos de pagos (`/api/pagos`). Generación de código QR y monitoreo de instancia activos.

**🚧 Lo que falta del plan (Siguientes pasos):**
- **Webhook de WhatsApp**: Desarrollar la ruta (ej. `app/api/webhooks/whatsapp/route.ts`) para recibir eventos de mensajes de Evolution API.
- **Integración con Gemini (OCR)**: Lógica dentro del webhook para interpretar imágenes de los comprobantes y extraer información (monto, referencia, banco).
- **Sincronización con PSKloud**: Inserción de los pagos aprobados en la base de datos de facturación.

**🛠 Problemas resueltos recientemente:**
- **Conflicto de Contenedores en VPS**: Limpieza de contenedores huérfanos de `evolution_api` que bloqueaban el arranque del stack.
- **Rediseño del docker-compose.yml**: Se integró explícitamente `redis` y se añadieron `healthchecks` tanto a Postgres como a Redis. Esto evita que Evolution API arranque a destiempo, solucionando definitivamente los errores de "Redis desconectado" y "fetch failed" que rompían la UI del frontend.

## Arquitectura recomendada

- VPS / servidor Docker: Evolution API y PostgreSQL para WhatsApp
- Supabase: base de datos principal de la app + auth + persistencia
- Local: conexión desde caja / sincronización con PSKloud y la web app
- Future app Next.js: consumo de Supabase y webhooks de Evolution

## Requisitos

- Docker Desktop o Docker Engine
- Docker Compose
- acceso a tu proyecto de Supabase
- llave API de Google Gemini si quieres OCR de comprobantes
- acceso a la VPS con Docker para Evolution

## Variables de entorno

Tiene que completar los valores reales en [.env.local](.env.local) antes de arrancar.

Variables mínimas imprescindibles:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SERVER_URL
- EVOLUTION_API_KEY
- EVOLUTION_DB_URI

## Arranque local del stack

1. Ajusta los valores reales en [.env.local](.env.local)
2. En la raíz del proyecto ejecuta:

```bash
docker compose up -d
```

3. Valida que Evolution esté disponible en:

```text
http://localhost:8081
```

4. Si quieres usar la VPS remota con Evolution, cambia `SERVER_URL` por la IP o dominio del servidor y usa el mismo `docker-compose.yml` desde la VPS.

## Puerto y endpoints

- Evolution API: http://localhost:8081
- PostgreSQL local: localhost:5432
- Webhook de Evolution: se configura desde el panel de la instancia apuntando a tu backend real

## Supabase

Haz lo siguiente en el panel de Supabase:

1. Crear proyecto
2. Ir a SQL Editor
3. Ejecutar el esquema de base de datos que te indiqué en la versión anterior del README
4. Copiar estas variables y pegarlas en [.env.local](.env.local):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

## Evolución del proyecto

Para dejarlo completamente operativo, el siguiente bloque a construir es la app Next.js con:

- autenticación con Supabase Auth
- CRUD de cierres diarios
- webhook de WhatsApp para Evolution
- OCR con Gemini
- sincronización con PSKloud

## Ruta real confirmada dentro del VPS

La ruta correcta que quedó confirmada en el servidor es:

```bash
/opt/evolution
```

Dentro de esa carpeta se encuentran los archivos reales:

```bash
ls -la /opt/evolution
find /opt/evolution -maxdepth 3 \( -name "vps-evolution-compose.yml" -o -name "docker-compose.yml" -o -name ".env" \) 2>/dev/null
```

Salida esperada:

```bash
/opt/evolution/.env
/opt/evolution/docker-compose.yml
```

En ese directorio se ejecutan los comandos de levantamiento del stack de Evolution.

```bash
cd /opt/evolution
ls -la
cat .env
cat docker-compose.yml
```

## Comandos útiles

```bash
docker compose -f vps-evolution-compose.yml --env-file .env config
docker compose -f vps-evolution-compose.yml --env-file .env up -d --force-recreate --remove-orphans
docker compose -f vps-evolution-compose.yml --env-file .env ps
docker compose -f vps-evolution-compose.yml --env-file .env logs -f evolution-api --tail=200
docker compose -f vps-evolution-compose.yml --env-file .env down
```

## Nota importante

Los valores actuales en [.env.local](.env.local) están como plantilla; no deben usarse en producción. Debes reemplazarlos por tus credenciales reales antes del despliegue.

## Siguiente paso recomendado

Si quieres, en el siguiente paso te dejo el proyecto real de Next.js ya montado completo con:

- estructura App Router
- login con Supabase
- panel de cierres
- formulario de arqueo
- base para webhooks de Evolution y OCR

