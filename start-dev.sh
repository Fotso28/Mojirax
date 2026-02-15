#!/bin/bash

# Script de démarrage pour le projet co-founder
# Stoppe les services existants puis relance tout proprement

echo "🔄 Redémarrage du projet co-founder..."

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution. Veuillez démarrer Docker Desktop."
    exit 1
fi

export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# 1. Stopper le web (Next.js) s'il tourne sur le port 3000
echo "⏹️  Arrêt de Next.js (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "   Next.js stoppé." || echo "   Next.js n'était pas en cours."

# 2. Stopper les containers Docker (api + postgres + redis)
echo "⏹️  Arrêt des services Docker..."
docker compose down 2>/dev/null && echo "   Docker stoppé." || echo "   Docker n'était pas en cours."

sleep 1

# 3. Relancer Docker (postgres + redis + api)
echo ""
echo "🐳 Démarrage de PostgreSQL, Redis et API..."
docker compose up -d --build

# 4. Attendre que l'API soit prête (healthcheck)
echo "⏳ Attente de l'API..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   API prête."
        break
    fi
    sleep 2
done

# 5. Sync Prisma (au cas où le schema a changé)
echo "🔄 Synchronisation Prisma..."
(cd apps/api && npx prisma db push --skip-generate 2>/dev/null)

# 6. Démarrer le web en local
echo ""
echo "🌐 Démarrage de Next.js..."
(cd apps/web && npm run dev) &

sleep 3

echo ""
echo "✅ Projet démarré avec succès!"
echo ""
echo "📍 Services disponibles:"
echo "   - Web (Next.js):  http://localhost:3000"
echo "   - API (NestJS):   http://localhost:3001"
echo "   - Swagger:        http://localhost:3001/api/docs"
echo "   - MinIO API:      http://localhost:9000"
echo "   - MinIO Console:  http://localhost:9001"
echo "   - PostgreSQL:     localhost:5433"
echo "   - Redis:          localhost:6379"
echo ""
echo "Pour tout arrêter: docker compose down && kill %1"
