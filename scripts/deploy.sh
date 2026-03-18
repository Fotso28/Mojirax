#!/bin/bash
set -euo pipefail

echo "=== MojiraX Deploy ==="

# Se placer dans le dossier du projet
cd "$(dirname "$0")/.."

# 1. Pull les dernières modifications
echo "[1/4] Git pull..."
git pull origin main

# 2. Build et relancer les containers, attendre qu'ils soient healthy
echo "[2/4] Build & restart containers..."
docker compose up -d --build --wait --wait-timeout 120

# 3. Nettoyer les vieilles images
echo "[3/4] Cleanup old images..."
docker image prune -f

# 4. Vérifier que tout tourne
echo "[4/4] Status..."
docker compose ps

echo ""
echo "=== Déploiement terminé ! ==="
