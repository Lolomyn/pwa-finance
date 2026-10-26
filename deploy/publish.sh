#!/usr/bin/env bash
# Publish the static PWA on this server via nginx + Cloudflare Quick Tunnel.
# Safe to re-run. No secrets are used here.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[publish] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
fail() { report "PUBLISH_FAIL: $1"; echo "FAIL: $1"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
APT=(-y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

say "apt update"
apt-get update -qq || fail "apt update"

say "install packages"
apt-get "${APT[@]}" install -qq curl ca-certificates git nginx jq || fail "apt install"

say "clone repo"
mkdir -p /var/www
if [ -d /var/www/pwa/.git ]; then
  git -C /var/www/pwa fetch --all --prune -q && git -C /var/www/pwa reset --hard origin/main -q
else
  git clone -q https://github.com/Lolomyn/pwa-finance.git /var/www/pwa
fi || fail "git clone"
[ -f /var/www/pwa/index.html ] || fail "index.html missing after clone"

say "nginx config"
cat > /etc/nginx/sites-available/pwa <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/pwa;
    index index.html;
    charset utf-8;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json application/manifest+json image/svg+xml;

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/pwa /etc/nginx/sites-enabled/pwa
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || fail "nginx config test"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx || fail "nginx restart"

say "cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL -o /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    || fail "cloudflared download"
  dpkg -i /tmp/cloudflared.deb >/dev/null 2>&1 || fail "cloudflared install"
fi

cat > /etc/systemd/system/cfquick.service <<'UNIT'
[Unit]
Description=Cloudflare quick tunnel for the PWA
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --url http://127.0.0.1:80 --no-autoupdate
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cfquick.service || fail "cloudflared service start"

say "waiting for tunnel url"
URL=""
for _ in $(seq 1 30); do
  URL=$(journalctl -u cfquick.service -n 200 --no-pager 2>/dev/null \
        | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
  [ -n "$URL" ] && break
  sleep 2
done
[ -n "$URL" ] || fail "no tunnel url in journal"

say "local check"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/ || echo ERR)
say "local http code: $CODE"

report "PWA_URL=$URL LOCAL=$CODE"
say "done: $URL"
