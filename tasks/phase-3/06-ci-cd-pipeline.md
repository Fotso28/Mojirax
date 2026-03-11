# 06 — CI/CD Pipeline (GitHub Actions)

## Résumé

Mettre en place un pipeline CI/CD avec GitHub Actions pour automatiser les tests, le build et le déploiement sur le VPS Hostinger.

## Contexte

**Ce qui existe :**
- Repo Git sur GitHub
- VPS Hostinger avec Node.js
- Docker Compose pour les services (PostgreSQL, Redis, MinIO)
- Aucun pipeline CI/CD

## Spécification

### A. CI — Tests & Build

**Fichier :** `.github/workflows/ci.yml`

**Triggers :** `push` sur `main`, `pull_request` sur `main`

**Jobs :**

1. **Lint & Typecheck**
   - `cd api && npx tsc --noEmit`
   - `cd web && npx tsc --noEmit`

2. **Tests API**
   - Service PostgreSQL (GitHub Actions service container)
   - `cd api && npx prisma migrate deploy && npm test`

3. **Build**
   - `cd api && npm run build`
   - `cd web && npm run build`

### B. CD — Déploiement

**Fichier :** `.github/workflows/deploy.yml`

**Trigger :** `push` sur `main` (après CI passé)

**Steps :**
1. SSH vers le VPS Hostinger
2. `git pull origin main`
3. `cd api && npm ci && npx prisma migrate deploy && npm run build`
4. `cd web && npm ci && npm run build`
5. Restart services (PM2 ou systemd)

**Secrets GitHub nécessaires :**
- `VPS_HOST` — IP du VPS
- `VPS_USER` — Utilisateur SSH
- `VPS_SSH_KEY` — Clé SSH privée
- `DATABASE_URL` — URL Postgres production

### C. Protection de branche

Configurer sur GitHub :
- `main` protégée : require PR + CI passing
- Minimum 1 review avant merge (optionnel si solo)

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `.github/workflows/ci.yml` | **Créer** |
| `.github/workflows/deploy.yml` | **Créer** |
| `api/Dockerfile` | **Créer** (optionnel, pour containerisation) |
| `web/Dockerfile` | **Créer** (optionnel) |

## Tests et validation

- [ ] Push sur une branche → CI tourne automatiquement
- [ ] PR vers `main` → CI doit passer avant merge
- [ ] Merge sur `main` → déploiement automatique sur le VPS
- [ ] Rollback possible (redéployer un commit précédent)
- [ ] Les secrets ne sont jamais exposés dans les logs

### Condition de validation finale

> Chaque push déclenche les tests et le build. Seul du code testé et buildable arrive sur `main`. Le déploiement sur le VPS est automatique après merge sur `main`.
