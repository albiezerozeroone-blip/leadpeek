#!/bin/bash
# Deploy LeadPeek to Hetzner VPS
# Usage: ./scripts/deploy.sh <server-ip> [ssh-key-path]

set -euo pipefail

SERVER_IP="${1:?Usage: ./scripts/deploy.sh <server-ip>}"
SSH_KEY="${2:-}"
SSH_OPTS="-o StrictHostKeyChecking=no"
[ -n "$SSH_KEY" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY"

echo "========================================="
echo "  LeadPeek Deploy to $SERVER_IP"
echo "========================================="

# Step 1: Install Docker on server (if needed)
echo ""
echo "[1/5] Installing Docker..."
ssh $SSH_OPTS root@$SERVER_IP << 'INSTALL_DOCKER'
if ! command -v docker &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    echo "Docker installed."
else
    echo "Docker already installed."
fi
INSTALL_DOCKER

# Step 2: Set up firewall
echo ""
echo "[2/5] Configuring firewall..."
ssh $SSH_OPTS root@$SERVER_IP << 'FIREWALL'
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured."
FIREWALL

# Step 3: Clone/update repo
echo ""
echo "[3/5] Deploying code..."
ssh $SSH_OPTS root@$SERVER_IP << 'DEPLOY_CODE'
cd /opt
if [ -d leadpeek ]; then
    cd leadpeek && git pull
else
    git clone https://github.com/albiezerozeroone-blip/leadpeek.git
    cd leadpeek
fi
DEPLOY_CODE

# Step 4: Copy production env
echo ""
echo "[4/5] Uploading secrets..."
scp $SSH_OPTS .env.production root@$SERVER_IP:/opt/leadpeek/.env.production

# Step 5: Build and start
echo ""
echo "[5/5] Building and starting containers..."
ssh $SSH_OPTS root@$SERVER_IP << 'START'
cd /opt/leadpeek
docker compose down 2>/dev/null || true
docker compose up -d --build
echo ""
echo "Waiting for services to start..."
sleep 10
docker compose ps
START

echo ""
echo "========================================="
echo "  LeadPeek deployed!"
echo "  URL: http://$SERVER_IP"
echo "========================================="
