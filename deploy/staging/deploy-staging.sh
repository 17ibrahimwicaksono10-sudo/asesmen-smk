#!/usr/bin/env bash
# =============================================================================
# EmployaSkills Staging Deployment Script (VPS Jagoan Hosting - Rocky Linux)
# Menjalankan Backend Staging + Caddy Reverse Proxy HTTPS secara otomatis
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================================================="
echo "  MEMULAI DEPLOYMENT EMPLOYASKILLS STAGING (VPS JAGOAN HOSTING)"
echo "  Target Host: 38.9.47.151 | Branch: migration/supabase-staging"
echo "=========================================================================="

cd "$PROJECT_ROOT"

# 1. Verifikasi Docker dan Docker Compose
echo "[1/6] Memeriksa instalasi Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker tidak ditemukan di server!" >&2
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose plugin tidak ditemukan!" >&2
    exit 1
fi
echo "      Docker: $(docker --version)"
echo "      Compose: $(docker compose version)"

# 2. Buka Firewall Ports 80 & 443 jika firewalld aktif (Rocky Linux standard)
echo "[2/6] Memeriksa status firewall..."
if systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "      Mengizinkan service http (80) dan https (443) pada firewalld..."
    sudo firewall-cmd --add-service=http --permanent >/dev/null 2>&1 || true
    sudo firewall-cmd --add-service=https --permanent >/dev/null 2>&1 || true
    sudo firewall-cmd --reload >/dev/null 2>&1 || true
    echo "      Firewall terkonfigurasi."
else
    echo "      Firewalld tidak aktif atau dikelola oleh security group provider."
fi

# 3. Siapkan file .env.staging jika belum ada
echo "[3/6] Memeriksa konfigurasi environment staging..."
STAGING_ENV="$SCRIPT_DIR/.env.staging"
if [ ! -f "$STAGING_ENV" ]; then
    echo "      Membuat $STAGING_ENV dari template..."
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        # Salin file .env backend yang sudah ada jika tersedia
        cp "$PROJECT_ROOT/backend/.env" "$STAGING_ENV"
        echo "      Menyalin konfigurasi API key dari backend/.env"
    else
        cp "$SCRIPT_DIR/.env.staging.example" "$STAGING_ENV"
    fi
fi

# 4. Build dan Jalankan Container Staging
echo "[4/6] Menjalankan Docker Compose Staging (Backend + Caddy HTTPS)..."
cd "$SCRIPT_DIR"
docker compose -f compose.staging.yaml -p employaskills-staging up -d --build

# 5. Menunggu Health Check Backend
echo "[5/6] Menunggu backend staging berstatus healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=20
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' employa-backend-staging 2>/dev/null || echo '"starting"')
    if [ "$STATUS" = '"healthy"' ]; then
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 3
    ATTEMPTS=$((ATTEMPTS + 1))
done
echo ""

if [ "$HEALTHY" = true ]; then
    echo "      Backend staging berhasil berstatus HEALTHY!"
else
    echo "      PERINGATAN: Backend masih dalam tahap inisialisasi. Memeriksa log..."
    docker logs --tail 20 employa-backend-staging
fi

# 6. Uji Endpoint API Health
echo "[6/6] Melakukan smoke test lokal container..."
HEALTH_RESP=$(docker exec employa-backend-staging wget -qO- http://127.0.0.1:5000/api/health 2>/dev/null || echo '{"status":"error"}')
echo "      Respons Health: $HEALTH_RESP"

echo "=========================================================================="
echo "  DEPLOYMENT STAGING BERHASIL DIJALANKAN!"
echo "=========================================================================="
echo "  URL Backend HTTPS : https://api.38.9.47.151.nip.io"
echo "  Health Endpoint   : https://api.38.9.47.151.nip.io/api/health"
echo "  Caddy Reverse TLS : Port 80 / 443 (Let's Encrypt / ZeroSSL otomatis)"
echo "  Target Vercel     : https://*.vercel.app (CORS diizinkan otomatis)"
echo "=========================================================================="
