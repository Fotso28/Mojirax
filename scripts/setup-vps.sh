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
echo "5. Symlink : ln -sf .env.production .env"
echo "6. Copier config Nginx :"
echo "   sudo cp nginx/mojirax.conf /etc/nginx/sites-available/mojirax"
echo "   sudo ln -sf /etc/nginx/sites-available/mojirax /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "7. Lancer Certbot :"
echo "   sudo certbot --nginx -d mojirax.com -d www.mojirax.com -d api.mojirax.com -d files.mojirax.com"
echo "8. Lancer : docker compose up -d --build --wait"
