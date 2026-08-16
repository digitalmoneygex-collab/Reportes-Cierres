#!/usr/bin/env bash
set -euo pipefail

# Configuración segura para VPS + Docker + Evolution API
# Este script instala Docker, prepara el entorno y levanta Evolution API en puerto 8081
# usando una exposición local y acceso privado vía Tailscale / reverse proxy.

export DEBIAN_FRONTEND=noninteractive

if [ "$EUID" -ne 0 ]; then
  echo "Ejecuta este script como root"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

cat > /etc/apt/sources.list.d/docker.list <<'EOF'
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

mkdir -p /opt/evolution
cat > /opt/evolution/.env <<'EOF'
SERVER_URL=https://tu-host.tailscale.net
EVOLUTION_API_KEY=cambia-esta-clave
POSTGRES_PASSWORD=postgres
EVOLUTION_DB_URI=postgres://postgres:postgres@postgres:5432/evolution
EOF

cat > /opt/evolution/docker-compose.yml <<'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: evolution_postgres
    restart: always
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - evolution_postgres_data:/var/lib/postgresql/data

  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution_api
    restart: always
    depends_on:
      - postgres
    ports:
      - "127.0.0.1:8081:8080"
    environment:
      SERVER_URL: ${SERVER_URL:-https://tu-host.tailscale.net}
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY:-cambia-esta-clave}
      DATABASE_ENABLED: "true"
      DATABASE_CONNECTION_URI: ${EVOLUTION_DB_URI:-postgres://postgres:postgres@postgres:5432/evolution}
      PORT: "8080"

volumes:
  evolution_postgres_data:
EOF

cd /opt/evolution
docker compose up -d

echo "============================"
echo "Docker listo en la VPS"
echo "Evolution API: http://127.0.0.1:8081"
echo "Acceso seguro recomendado: Tailscale / Caddy / Cloudflare Tunnel"
echo "============================"
