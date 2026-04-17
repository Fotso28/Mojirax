#!/bin/bash
set -euo pipefail

# ============================================================
# MojiraX — Setup VPS (Ubuntu/Debian)
# Ce script prépare un serveur vierge pour héberger MojiraX
# Exécuter en root : sudo bash setup-vps.sh
# ============================================================

PROJECT_PATH="/home/deploy/mojirax"

echo "=== MojiraX VPS Setup ==="
echo ""

# 1. Mise à jour système
echo "[1/8] Mise à jour système..."
apt update && apt upgrade -y

# 2. Installer Docker
echo "[2/8] Installation Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "  Docker déjà installé."
fi

# 3. Installer Docker Compose (plugin)
echo "[3/8] Docker Compose..."
if ! docker compose version &>/dev/null; then
    apt install -y docker-compose-plugin
else
    echo "  Docker Compose déjà installé."
fi

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
    echo "  Utilisateur 'deploy' créé et ajouté au groupe docker."
else
    echo "  Utilisateur 'deploy' existe déjà."
    # S'assurer qu'il est dans le groupe docker
    usermod -aG docker deploy
fi

# 8. Dossiers et cron jobs
echo "[8/8] Dossiers et cron jobs..."
mkdir -p /home/deploy/backups

# Auto-restart au reboot
CRON_REBOOT="@reboot cd ${PROJECT_PATH} && docker compose up -d"
# Backup PostgreSQL quotidien à 3h
CRON_BACKUP="0 3 * * * cd ${PROJECT_PATH} && docker compose exec -T postgres pg_dump -U \$(grep POSTGRES_USER .env | cut -d= -f2) \$(grep POSTGRES_DB .env | cut -d= -f2) | gzip > /home/deploy/backups/db-\$(date +\\%Y\\%m\\%d).sql.gz"
# Nettoyage backups > 30 jours
CRON_CLEANUP="0 4 * * * find /home/deploy/backups -name '*.sql.gz' -mtime +30 -delete"
# Auto-renouvellement SSL
CRON_SSL="0 5 * * 1 certbot renew --quiet && systemctl reload nginx"

(crontab -u deploy -l 2>/dev/null || true; echo "${CRON_REBOOT}"; echo "${CRON_BACKUP}"; echo "${CRON_CLEANUP}") | sort -u | crontab -u deploy -

# SSL renewal en root crontab
(crontab -l 2>/dev/null || true; echo "${CRON_SSL}") | sort -u | crontab -

chown -R deploy:deploy /home/deploy/backups

echo ""
echo "=== Setup terminé ! ==="
echo ""
echo "======================================"
echo "  Prochaines étapes (en tant que root)"
echo "======================================"
echo ""
echo "1. Pointer les DNS vers cette IP :"
echo "   - mojirax.com       → $(curl -s ifconfig.me 2>/dev/null || echo '<IP_SERVEUR>')"
echo "   - api.mojirax.com   → même IP"
echo "   - files.mojirax.com → même IP"
echo "   - www.mojirax.com   → même IP"
echo ""
echo "2. Cloner le repo (en tant que deploy) :"
echo "   su - deploy"
echo "   git clone <REPO_URL> ${PROJECT_PATH}"
echo ""
echo "3. Configurer l'environnement :"
echo "   cd ${PROJECT_PATH}"
echo "   cp .env.production.example .env.production"
echo "   nano .env.production          # Remplir TOUS les secrets"
echo "   ln -sf .env.production .env   # Docker Compose lit .env"
echo ""
echo "4. Installer la config Nginx :"
echo "   sudo cp ${PROJECT_PATH}/nginx/mojirax.conf /etc/nginx/sites-available/mojirax"
echo "   sudo ln -sf /etc/nginx/sites-available/mojirax /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "5. Obtenir les certificats SSL :"
echo "   sudo certbot --nginx -d mojirax.com -d www.mojirax.com -d api.mojirax.com -d files.mojirax.com"
echo ""
echo "6. Premier déploiement :"
echo "   cd ${PROJECT_PATH}"
echo "   bash scripts/deploy.sh"
echo ""
echo "7. (Optionnel) Créer l'admin :"
echo "   docker compose exec api npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts"
echo ""
