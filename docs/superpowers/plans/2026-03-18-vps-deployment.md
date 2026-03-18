# Déploiement MojiraX sur VPS Hostinger — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer l'application MojiraX (Next.js + NestJS + PostgreSQL + Redis + MinIO) sur un VPS Hostinger KVM 2 avec Docker Compose, Nginx reverse proxy et SSL Let's Encrypt.

**Architecture:**
- Docker Compose orchestre 5 services : postgres (pgvector), redis, minio, api (NestJS), web (Next.js)
- Nginx installé directement sur le VPS comme reverse proxy + terminaison SSL
- 3 sous-domaines : `mojirax.com` (frontend), `api.mojirax.com` (API), `files.mojirax.com` (MinIO)
- Certbot pour les certificats SSL automatiques Let's Encrypt

**Tech Stack:** Docker, Docker Compose, Nginx, Certbot, Ubuntu 22.04/24.04

---

## Fichiers à créer/modifier

| Fichier | Rôle |
|---------|------|
| `api/Dockerfile` | Image Docker NestJS (multi-stage build) — **remplace l'existant cassé** |
| `api/.dockerignore` | Exclusions build API |
| `web/Dockerfile` | Image Docker Next.js (multi-stage build) — **remplace l'existant cassé** |
| `web/.dockerignore` | Exclusions build Web |
| `web/next.config.ts` | **Modifier** : ajouter `output: 'standalone'` |
| `docker-compose.yml` | Orchestration des 5 services |
| `.dockerignore` | Exclure node_modules, .env, etc. |
| `.env.production.example` | Template des variables d'env production |
| `nginx/mojirax.conf` | Config Nginx reverse proxy |
| `scripts/deploy.sh` | Script de déploiement automatisé |
| `scripts/setup-vps.sh` | Script d'initialisation du VPS (one-time) |

---

### Task 1: Dockerfile API (NestJS)

**Files:**
- Replace: `api/Dockerfile` (l'existant utilise l'ancienne structure `apps/api/` — cassé)
- Create: `api/.dockerignore`

- [ ] **Step 1: Créer `api/.dockerignore`**

```
node_modules
dist
.env
*.md
.git
coverage
test
```

- [ ] **Step 2: Remplacer `api/Dockerfile` (multi-stage)**

```dockerfile
# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# Production deps only
RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

# --- Stage 2: Production ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

> Note : Le `npm ci --omit=dev` après le build réduit la taille de l'image (prod deps seulement). Le second `prisma generate` est nécessaire car `--ignore-scripts` skip le postinstall.

- [ ] **Step 3: Tester le build localement**

Run: `cd api && docker build -t mojirax-api .`
Expected: Build réussi sans erreur

- [ ] **Step 4: Commit**

```bash
git add api/Dockerfile api/.dockerignore
git commit -m "infra: add Dockerfile for NestJS API (production-optimized)"
```

---

### Task 2: Dockerfile Web (Next.js)

**Files:**
- Replace: `web/Dockerfile` (l'existant utilise l'ancienne structure `apps/web/` — cassé)
- Create: `web/.dockerignore`
- Modify: `web/next.config.ts` (ajouter `output: 'standalone'`)

- [ ] **Step 1: Créer `web/.dockerignore`**

```
node_modules
.next
.env
*.md
.git
coverage
```

- [ ] **Step 2: Remplacer `web/Dockerfile` (multi-stage)**

```dockerfile
# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Les NEXT_PUBLIC_ doivent être disponibles au build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY
ARG NEXT_PUBLIC_UPLOAD_HOST

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY
ENV NEXT_PUBLIC_UPLOAD_HOST=$NEXT_PUBLIC_UPLOAD_HOST
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 3: Production ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

> Notes :
> - `HOSTNAME="0.0.0.0"` est **obligatoire** pour que Next.js standalone écoute sur toutes les interfaces dans Docker
> - `NEXT_TELEMETRY_DISABLED=1` empêche l'envoi de télémétrie à Vercel

- [ ] **Step 3: Ajouter `output: 'standalone'` dans next.config.ts**

Modifier `web/next.config.ts` — ajouter `output: 'standalone'` dans `nextConfig` :

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // <-- ajouter cette ligne
  turbopack: {},
  // ... reste inchangé
};
```

**CRITIQUE** : Sans cette ligne, le Dockerfile échouera car `.next/standalone` ne sera pas généré.

- [ ] **Step 4: Tester le build localement**

Run: `cd web && docker build --build-arg NEXT_PUBLIC_API_URL=https://api.mojirax.com -t mojirax-web .`
Expected: Build réussi

- [ ] **Step 5: Commit**

```bash
git add web/Dockerfile web/.dockerignore web/next.config.ts
git commit -m "infra: add Dockerfile for Next.js frontend with standalone output"
```

---

### Task 3: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.env.production.example`

- [ ] **Step 1: Créer `.dockerignore` racine**

```
.git
node_modules
**/node_modules
**/.next
**/dist
**/.env
*.md
docs
tests
prompts
inspiration
```

- [ ] **Step 2: Créer `.env.production.example`**

```bash
# ===== GENERAL =====
NODE_ENV=production
FRONTEND_URL=https://mojirax.com

# ===== DATABASE =====
POSTGRES_USER=mojirax
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=co_founder_db
DATABASE_URL=postgresql://mojirax:CHANGE_ME_STRONG_PASSWORD@postgres:5432/co_founder_db

# ===== REDIS =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# ===== MINIO =====
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=CHANGE_ME_MINIO_PASSWORD
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_URL=https://files.mojirax.com
MINIO_BUCKET=co-founder-avatars
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=CHANGE_ME_MINIO_PASSWORD

# ===== API =====
API_PORT=5001

# ===== FIREBASE (Backend — Service Account) =====
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# ===== FIREBASE (Frontend — Public Config) =====
NEXT_PUBLIC_API_URL=https://api.mojirax.com
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_UPLOAD_HOST=files.mojirax.com

# ===== AI =====
ANTHROPIC_API_KEY=
JINA_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=

# ===== EMAIL (Brevo) =====
BREVO_API_KEY=
```

- [ ] **Step 3: Créer `docker-compose.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    environment:
      REDISCLI_AUTH: ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      FRONTEND_URL: ${FRONTEND_URL}
      API_PORT: 5001
      MINIO_ENDPOINT: ${MINIO_ENDPOINT}
      MINIO_PUBLIC_URL: ${MINIO_PUBLIC_URL}
      MINIO_BUCKET: ${MINIO_BUCKET}
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
      FIREBASE_CLIENT_EMAIL: ${FIREBASE_CLIENT_EMAIL}
      FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      JINA_API_KEY: ${JINA_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      BREVO_API_KEY: ${BREVO_API_KEY}
    ports:
      - "127.0.0.1:5001:5001"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5001/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_FIREBASE_API_KEY: ${NEXT_PUBLIC_FIREBASE_API_KEY}
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
        NEXT_PUBLIC_FIREBASE_APP_ID: ${NEXT_PUBLIC_FIREBASE_APP_ID}
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: ${NEXT_PUBLIC_FIREBASE_VAPID_KEY}
        NEXT_PUBLIC_UPLOAD_HOST: ${NEXT_PUBLIC_UPLOAD_HOST}
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .dockerignore .env.production.example
git commit -m "infra: add Docker Compose with all services"
```

---

### Task 4: Configuration Nginx + SSL

**Files:**
- Create: `nginx/mojirax.conf`

- [ ] **Step 1: Créer `nginx/mojirax.conf`**

```nginx
# --- Redirect www → bare domain ---
server {
    listen 80;
    server_name www.mojirax.com;
    return 301 https://mojirax.com$request_uri;
}

# --- Frontend : mojirax.com ---
server {
    listen 80;
    server_name mojirax.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name mojirax.com;

    ssl_certificate /etc/letsencrypt/live/mojirax.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mojirax.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# www HTTPS → bare domain
server {
    listen 443 ssl;
    http2 on;
    server_name www.mojirax.com;

    ssl_certificate /etc/letsencrypt/live/mojirax.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mojirax.com/privkey.pem;

    return 301 https://mojirax.com$request_uri;
}

# --- API : api.mojirax.com ---
server {
    listen 80;
    server_name api.mojirax.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name api.mojirax.com;

    ssl_certificate /etc/letsencrypt/live/mojirax.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mojirax.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    # Rate limiting basique
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location / {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Socket.io)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

# --- MinIO Files : files.mojirax.com ---
server {
    listen 80;
    server_name files.mojirax.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name files.mojirax.com;

    ssl_certificate /etc/letsencrypt/live/mojirax.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mojirax.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> Notes :
> - `limit_req_zone` placé dans le contexte `http` — si Nginx refuse, le déplacer dans `/etc/nginx/nginx.conf`
> - `http2 on;` (syntaxe moderne Nginx 1.25+). Si Ubuntu 22.04 avec Nginx < 1.25, utiliser `listen 443 ssl http2;` à la place
> - Redirect `www` → `mojirax.com` pour le SEO

- [ ] **Step 2: Commit**

```bash
git add nginx/mojirax.conf
git commit -m "infra: add Nginx config with SSL, WebSocket, rate limiting, www redirect"
```

---

### Task 5: Script d'initialisation VPS (one-time)

**Files:**
- Create: `scripts/setup-vps.sh`

- [ ] **Step 1: Créer `scripts/setup-vps.sh`**

```bash
#!/bin/bash
set -euo pipefail

echo "=== MojiraX VPS Setup ==="

# 1. Mise à jour système
echo "[1/8] Mise à jour système..."
apt update && apt upgrade -y

# 2. Installer Docker
echo "[2/8] Installation Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 3. Installer Docker Compose (plugin)
echo "[3/8] Docker Compose..."
apt install -y docker-compose-plugin

# 4. Installer Nginx
echo "[4/8] Installation Nginx..."
apt install -y nginx
systemctl enable nginx

# 5. Installer Certbot
echo "[5/8] Installation Certbot..."
apt install -y certbot python3-certbot-nginx

# 6. Firewall (UFW)
echo "[6/8] Configuration firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 7. Créer utilisateur deploy
echo "[7/8] Création utilisateur deploy..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
fi

# 8. Auto-start Docker Compose au reboot + backup quotidien
echo "[8/8] Cron jobs..."
mkdir -p /home/deploy/backups

# Docker Compose auto-start au reboot
CRON_REBOOT="@reboot cd /home/deploy/mojirax && docker compose up -d"
# Backup PostgreSQL quotidien à 3h du matin
CRON_BACKUP="0 3 * * * cd /home/deploy/mojirax && docker compose exec -T postgres pg_dump -U mojirax co_founder_db | gzip > /home/deploy/backups/db-\$(date +\%Y\%m\%d).sql.gz"
# Nettoyer les backups > 30 jours
CRON_CLEANUP="0 4 * * * find /home/deploy/backups -name '*.sql.gz' -mtime +30 -delete"

(crontab -u deploy -l 2>/dev/null || true; echo "$CRON_REBOOT"; echo "$CRON_BACKUP"; echo "$CRON_CLEANUP") | sort -u | crontab -u deploy -

chown -R deploy:deploy /home/deploy/backups

echo ""
echo "=== Setup terminé ! ==="
echo ""
echo "Prochaines étapes manuelles :"
echo "1. Pointer les DNS (mojirax.com, api.mojirax.com, files.mojirax.com) vers cette IP"
echo "2. Attendre propagation DNS (5-30 min)"
echo "3. Cloner le repo : su - deploy && git clone <repo> /home/deploy/mojirax"
echo "4. Configurer .env.production (cp .env.production.example .env.production && nano .env.production)"
echo "5. Copier config Nginx : cp nginx/mojirax.conf /etc/nginx/sites-available/mojirax"
echo "6. Lancer Certbot : certbot --nginx -d mojirax.com -d www.mojirax.com -d api.mojirax.com -d files.mojirax.com"
echo "7. Lancer : docker compose up -d --build"
```

- [ ] **Step 2: Rendre exécutable et commit**

```bash
chmod +x scripts/setup-vps.sh
git add scripts/setup-vps.sh
git commit -m "infra: add VPS setup script (Docker, Nginx, Certbot, UFW, auto-backup)"
```

---

### Task 6: Script de déploiement

**Files:**
- Create: `scripts/deploy.sh`

- [ ] **Step 1: Créer `scripts/deploy.sh`**

```bash
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
```

- [ ] **Step 2: Rendre exécutable et commit**

```bash
chmod +x scripts/deploy.sh
git add scripts/deploy.sh
git commit -m "infra: add deployment script with health verification"
```

---

### Task 7: Configuration DNS Hostinger

> Cette tâche est manuelle (panneau Hostinger).

- [ ] **Step 1: Se connecter au panneau Hostinger → DNS Zone**

- [ ] **Step 2: Ajouter les enregistrements DNS A**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<IP_DU_VPS>` | 3600 |
| A | www | `<IP_DU_VPS>` | 3600 |
| A | api | `<IP_DU_VPS>` | 3600 |
| A | files | `<IP_DU_VPS>` | 3600 |

- [ ] **Step 3: Attendre la propagation DNS (5-30 minutes)**

Vérifier avec : `dig mojirax.com +short` et `dig api.mojirax.com +short`

---

### Task 8: Déploiement initial sur le VPS

- [ ] **Step 1: SSH dans le VPS**

```bash
ssh root@<IP_DU_VPS>
```

- [ ] **Step 2: Lancer le script de setup**

```bash
# Option A — si le repo est déjà cloné
bash scripts/setup-vps.sh

# Option B — copier le script manuellement via scp
scp scripts/setup-vps.sh root@<IP_DU_VPS>:/tmp/
ssh root@<IP_DU_VPS> bash /tmp/setup-vps.sh
```

- [ ] **Step 3: Cloner le repo**

```bash
su - deploy
git clone https://github.com/<ton-user>/co-founder.git /home/deploy/mojirax
cd /home/deploy/mojirax
```

- [ ] **Step 4: Configurer le .env de production**

```bash
cp .env.production.example .env.production
nano .env.production
# Remplir TOUTES les valeurs (Firebase, AI keys, mots de passe forts)
# Utiliser des mots de passe générés : openssl rand -base64 32
```

Puis créer un symlink pour que Docker Compose le lise :
```bash
ln -sf .env.production .env
```

- [ ] **Step 5: Copier la config Nginx**

```bash
sudo cp nginx/mojirax.conf /etc/nginx/sites-available/mojirax
sudo ln -sf /etc/nginx/sites-available/mojirax /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

> Note : si `limit_req_zone` cause une erreur dans `nginx -t`, déplacer la directive dans `/etc/nginx/nginx.conf` dans le bloc `http {}`.

- [ ] **Step 6: Obtenir les certificats SSL**

```bash
sudo certbot --nginx -d mojirax.com -d www.mojirax.com -d api.mojirax.com -d files.mojirax.com
```

Certbot va modifier automatiquement la config Nginx. Accepter le renouvellement automatique.

- [ ] **Step 7: Lancer Docker Compose**

```bash
cd /home/deploy/mojirax
docker compose up -d --build --wait --wait-timeout 180
```

Première exécution : Prisma va appliquer les migrations automatiquement via le CMD du Dockerfile API.

- [ ] **Step 8: Créer le bucket MinIO**

```bash
# Installer mc (MinIO Client) sur le host
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configurer et créer le bucket
mc alias set mojirax http://127.0.0.1:9000 minioadmin <MINIO_ROOT_PASSWORD>
mc mb mojirax/co-founder-avatars
mc anonymous set download mojirax/co-founder-avatars
```

- [ ] **Step 9: Vérifier que tout fonctionne**

```bash
# Containers up et healthy
docker compose ps

# API health
curl -s https://api.mojirax.com/health

# Frontend (doit retourner 200)
curl -s -o /dev/null -w "%{http_code}" https://mojirax.com

# MinIO
curl -s -o /dev/null -w "%{http_code}" https://files.mojirax.com/minio/health/live
```

- [ ] **Step 10: Créer le compte admin**

```bash
docker compose exec api node dist/scripts/create-admin.js
```

> Note : En production, l'image ne contient que le JS compilé (`dist/`), pas les sources TypeScript. Utiliser `node dist/...` et non `ts-node src/...`.

---

### Task 9: Configurer le renouvellement SSL automatique

- [ ] **Step 1: Vérifier que le timer Certbot est actif**

```bash
sudo systemctl status certbot.timer
```

- [ ] **Step 2: Tester le renouvellement**

```bash
sudo certbot renew --dry-run
```

Expected: "Congratulations, all simulated renewals succeeded"

---

## Résumé des commandes de maintenance

| Action | Commande |
|--------|----------|
| Déployer une mise à jour | `bash scripts/deploy.sh` |
| Voir les logs API | `docker compose logs -f api` |
| Voir les logs Web | `docker compose logs -f web` |
| Voir tous les logs | `docker compose logs -f` |
| Restart un service | `docker compose restart api` |
| Status | `docker compose ps` |
| Backup PostgreSQL (manuel) | `docker compose exec -T postgres pg_dump -U mojirax co_founder_db > backup.sql` |
| Restore PostgreSQL | `docker compose exec -T postgres psql -U mojirax co_founder_db < backup.sql` |
| Shell dans un container | `docker compose exec api sh` |

> Les backups automatiques sont configurés via cron (quotidien à 3h, rétention 30 jours) dans `setup-vps.sh`.

---

## Estimation RAM (KVM 2 — 8 Go)

| Service | RAM estimée |
|---------|-------------|
| PostgreSQL + pgvector | ~500 Mo |
| Redis | ~50 Mo |
| MinIO | ~200 Mo |
| NestJS API | ~200 Mo |
| Next.js Web | ~300 Mo |
| Nginx | ~20 Mo |
| Système Ubuntu | ~500 Mo |
| **Total** | **~1.8 Go / 8 Go** |

Marge confortable pour les pics de charge.
