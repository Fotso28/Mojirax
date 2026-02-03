#!/bin/bash

# Script de démarrage pour le projet co-founder
# Ce script lance Docker (postgres + api) et le web en local

echo "🚀 Démarrage du projet co-founder..."

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution. Veuillez démarrer Docker Desktop."
    exit 1
fi

# Démarrer les services Docker (postgres + api)
echo "🐳 Démarrage de PostgreSQL et de l'API..."
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose up -d

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 5

# Démarrer l'application Web en local
echo "🌐 Démarrage de l'application Web (Next.js)..."
cd apps/web && npm run dev &

echo ""
echo "✅ Projet démarré avec succès!"
echo ""
echo "📍 Services disponibles:"
echo "   - Web (Next.js):  http://localhost:3000"
echo "   - API (NestJS):   http://localhost:3001"
echo "   - PostgreSQL:     localhost:5432"
echo ""
echo "Pour arrêter les services Docker: docker compose down"
echo "Pour arrêter le web: Ctrl+C dans ce terminal"
