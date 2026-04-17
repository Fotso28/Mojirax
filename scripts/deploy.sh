#!/bin/bash
set -euo pipefail

# ============================================================
# MojiraX — Script de déploiement production
# Chemin attendu : /home/deploy/mojirax
# Usage : ./scripts/deploy.sh
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"

echo "=== MojiraX Deploy ==="
echo "Dossier : ${PROJECT_DIR}"
echo ""

# ------ Pré-requis ------
if ! command -v docker &>/dev/null; then
    echo "ERREUR : Docker n'est pas installé. Lancer scripts/setup-vps.sh d'abord."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "ERREUR : Docker Compose plugin manquant."
    exit 1
fi

# ------ Vérifier .env ------
if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${PROJECT_DIR}/.env.production" ]; then
        echo "[env] Symlink .env → .env.production"
        ln -sf .env.production "${ENV_FILE}"
    else
        echo "ERREUR : Fichier .env introuvable."
        echo "  cp .env.production.example .env.production"
        echo "  nano .env.production"
        echo "  ln -sf .env.production .env"
        exit 1
    fi
fi

# Vérifier que les variables critiques sont définies
source "${ENV_FILE}"
MISSING=""
for VAR in POSTGRES_PASSWORD REDIS_PASSWORD DATABASE_URL FIREBASE_PROJECT_ID FRONTEND_URL; do
    if [ -z "${!VAR:-}" ]; then
        MISSING="${MISSING}  - ${VAR}\n"
    fi
done
if [ -n "${MISSING}" ]; then
    echo "ERREUR : Variables manquantes dans .env :"
    echo -e "${MISSING}"
    exit 1
fi

# ------ Git pull ------
cd "${PROJECT_DIR}"

if git rev-parse --is-inside-work-tree &>/dev/null; then
    echo "[1/5] Git pull..."
    git pull origin main
else
    echo "[1/5] Pas un repo git, skip pull."
fi

# ------ Build & start ------
echo "[2/5] Build & restart containers..."
docker compose up -d --build --wait --wait-timeout 180

# ------ Post-deploy : MinIO bucket ------
echo "[3/5] Vérification bucket MinIO..."
BUCKET="${MINIO_BUCKET:-co-founder-avatars}"

# Attendre que MinIO soit prêt
sleep 2
docker compose exec -T minio mc alias set local http://localhost:9000 "${MINIO_ROOT_USER:-minioadmin}" "${MINIO_ROOT_PASSWORD}" 2>/dev/null || true
if docker compose exec -T minio mc ls "local/${BUCKET}" &>/dev/null; then
    echo "  Bucket '${BUCKET}' existe déjà."
else
    echo "  Création du bucket '${BUCKET}'..."
    docker compose exec -T minio mc mb "local/${BUCKET}" 2>/dev/null || true
    docker compose exec -T minio mc anonymous set download "local/${BUCKET}" 2>/dev/null || true
    echo "  Bucket créé avec accès public en lecture."
fi

# ------ Nettoyage ------
echo "[4/5] Nettoyage vieilles images..."
docker image prune -f

# ------ Statut final ------
echo "[5/5] Statut des services :"
docker compose ps
echo ""

# Vérifier santé de l'API
API_STATUS=$(docker compose exec -T api wget -qO- http://127.0.0.1:5001/health 2>/dev/null || echo "UNREACHABLE")
echo "API Health : ${API_STATUS}"

echo ""
echo "=== Déploiement terminé ! ==="
echo "Frontend : ${FRONTEND_URL}"
echo "API      : ${NEXT_PUBLIC_API_URL:-https://api.mojirax.com}"
