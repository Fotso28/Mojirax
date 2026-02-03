# Configuration de Développement - co-founder

## Architecture Hybride

Ce projet utilise une **configuration hybride** pour optimiser le développement:

- **Docker** : PostgreSQL + Redis + API (NestJS) avec **hot reload**
- **Local** : Application Web (Next.js)

### Pourquoi cette approche?

L'application Web Next.js rencontre des problèmes de timeout réseau lors du build Docker. En l'exécutant localement, vous bénéficiez de:
- ✅ Hot reload instantané
- ✅ Pas de problèmes réseau
- ✅ Meilleure performance de développement

## Démarrage Rapide

### Option 1: Script automatique (Recommandé)

```bash
./start-dev.sh
```

### Option 2: Démarrage manuel

```bash
# 1. Démarrer Docker (PostgreSQL + API avec hot reload)
docker compose up -d

# 2. Démarrer le Web (dans un autre terminal)
cd apps/web
npm run dev
```

## Services

| Service | URL | Hot Reload | Description |
|---------|-----|------------|-------------|
| **Web** | http://localhost:3000 | ✅ | Application Next.js (local) |
| **API** | http://localhost:3001 | ✅ | API NestJS (Docker) |
| **PostgreSQL** | localhost:5433 | N/A | Base de données (Docker) |
| **Redis** | localhost:6379 | N/A | Cache & Queue (Docker) |

## Configuration

### PostgreSQL
```
Host: localhost
Port: 5433
User: admin
Password: password
Database: co_founder_db
```

### Redis
```
Host: localhost
Port: 6379
Password: (none)
```

### Variables d'Environnement

Copiez `.env.example` vers `.env` pour personnaliser la configuration:
```bash
cp .env.example .env
```

## Hot Reload API

L'API NestJS dans Docker utilise maintenant `npm run start:dev` avec:
- **Volumes montés** : Les changements dans `apps/api/src` sont détectés automatiquement
- **Rechargement automatique** : Pas besoin de redémarrer le container

**Voir les logs en temps réel:**
```bash
docker compose logs -f api
```

## Health Checks

Tous les services Docker ont des health checks configurés:
- **PostgreSQL** : Vérifie que la base accepte les connexions
- **Redis** : Vérifie avec `PING` command
- **API** : Vérifie que le serveur HTTP répond

**Vérifier le statut:**
```bash
docker compose ps
# Tous les services doivent afficher "healthy"
```

## Arrêter les Services

```bash
# Arrêter Docker
docker compose down

# Arrêter le Web: Ctrl+C dans le terminal
```

## Commandes Utiles

```bash
# Voir les logs de l'API en temps réel
docker compose logs -f api

# Voir les logs de PostgreSQL
docker compose logs -f postgres

# Voir les logs de Redis
docker compose logs -f redis

# Redémarrer l'API (si nécessaire)
docker compose restart api

# Rebuild l'API après changement de dépendances
docker compose up -d --build api

# Accéder à la base de données
docker exec -it co-founder-postgres psql -U admin -d co_founder_db

# Accéder à Redis CLI
docker exec -it co-founder-redis redis-cli

# Tester Redis
docker exec -it co-founder-redis redis-cli ping
# Attendu: PONG
```

## Structure du Projet

```
co-founder/
├── apps/
│   ├── api/          # NestJS API (Docker avec hot reload)
│   ├── web/          # Next.js App (Local)
│   └── ...
├── packages/
│   └── types/        # Types partagés
├── docker-compose.yml # PostgreSQL + Redis + API
├── .env.example      # Template de configuration
└── start-dev.sh      # Script de démarrage
```

## Troubleshooting

### Docker ne démarre pas
```bash
# Vérifier que Docker Desktop est lancé
docker info

# Si problème, redémarrer Docker Desktop
```

### Port 3000, 3001 ou 5433 déjà utilisé
```bash
# Trouver le processus
lsof -i :3000
lsof -i :3001
lsof -i :5433

# Tuer le processus
kill -9 <PID>
```

### L'API ne se connecte pas à PostgreSQL
```bash
# Vérifier que PostgreSQL est démarré
docker compose ps

# Redémarrer les services
docker compose restart
```

### Hot reload ne fonctionne pas
```bash
# Vérifier que les volumes sont montés
docker compose config

# Redémarrer avec rebuild
docker compose down
docker compose up -d --build
```
