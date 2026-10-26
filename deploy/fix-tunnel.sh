#!/usr/bin/env bash
# Publish the PWA through an outbound tunnel, trying several transports until one works.
# Safe to re-run. No secrets. Progress is reported to a public ntfy topic.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[tunnel] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

check_url() {
  local url="$1" code="" i
  for i in $(seq 1 8); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$url/" 2>/dev/null)
    [ "$code" = "200" ] && { echo "200"; return 0; }
    sleep 3
  done
  echo "${code:-ERR}"
  return 1
}

write_unit() {
  local extra="$1"
  cat > /etc/systemd/system/cfquick.service <<UNIT
[Unit]
Description=Cloudflare quick tunnel for the PWA
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --url http://127.0.0.1:80 --no-autoupdate $extra
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
}

try_cloudflared() {
  local extra="$1" label="$2" since url code
  say "cloudflared variant: $label"
  write_unit "$extra"
  systemctl daemon-reload
  systemctl stop cfquick >/dev/null 2>&1
  systemctl reset-failed cfquick >/dev/null 2>&1
  since=$(date '+%Y-%m-%d %H:%M:%S')
  systemctl start cfquick >/dev/null 2>&1
  url=""
  for _ in $(seq 1 20); do
    url=$(journalctl -u cfquick --since "$since" --no-pager 2>/dev/null \
          | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    [ -n "$url" ] && break
    sleep 2
  done
  if [ -z "$url" ]; then
    say "no url for $label"
    report "cf[$label] no url"
    return 1
  fi
  code=$(check_url "$url")
  say "$label -> $url -> $code"
  report "cf[$label] $url -> $code"
  [ "$code" = "200" ] || return 1
  echo "$url" > /tmp/winner_url
  echo "cloudflare-$label" > /tmp/winner_transport
  return 0
}

try_lhr() {
  local url="" code
  say "localhost.run variant"
  rm -f /tmp/lhr.log
  systemctl stop lhrun >/dev/null 2>&1
  systemctl reset-failed lhrun >/dev/null 2>&1
  systemd-run --unit=lhrun \
    --property=StandardOutput=file:/tmp/lhr.log \
    --property=StandardError=file:/tmp/lhr.log \
    /usr/bin/ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 \
      -o ExitOnForwardFailure=yes -N -R 80:localhost:80 nokey@localhost.run >/dev/null 2>&1
  for _ in $(seq 1 20); do
    url=$(grep -oE 'https://[a-z0-9-]+\.lhr\.life' /tmp/lhr.log 2>/dev/null | tail -1)
    [ -n "$url" ] && break
    sleep 2
  done
  if [ -z "$url" ]; then
    say "no url from localhost.run"
    report "lhr no url"
    return 1
  fi
  code=$(check_url "$url")
  say "lhr -> $url -> $code"
  report "lhr $url -> $code"
  [ "$code" = "200" ] || return 1
  echo "$url" > /tmp/winner_url
  echo "localhost.run" > /tmp/winner_transport
  return 0
}

# --- preflight ---------------------------------------------------------------
if ! systemctl is-active --quiet nginx; then
  say "nginx not running, restarting"
  systemctl restart nginx >/dev/null 2>&1
fi
LOCAL=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/ 2>/dev/null)
say "local nginx: ${LOCAL:-ERR}"
report "start: local nginx ${LOCAL:-ERR}"
[ "$LOCAL" = "200" ] || { report "FATAL: nginx local ${LOCAL:-ERR}"; exit 1; }

# --- attempts ----------------------------------------------------------------
rm -f /tmp/winner_url /tmp/winner_transport
ok=0

if command -v cloudflared >/dev/null 2>&1; then
  try_cloudflared "--protocol http2 --edge-ip-version 4" "http2-v4" && ok=1
  [ $ok -eq 1 ] || { try_cloudflared "--protocol http2" "http2" && ok=1; }
  [ $ok -eq 1 ] || { try_cloudflared "--edge-ip-version 4" "quic-v4" && ok=1; }
else
  say "cloudflared missing"
fi

[ $ok -eq 1 ] || { try_lhr && ok=1; }

# --- result ------------------------------------------------------------------
if [ $ok -eq 1 ]; then
  URL=$(cat /tmp/winner_url)
  TR=$(cat /tmp/winner_transport)
  report "DONE transport=$TR url=$URL"
  say "DONE $TR $URL"
  echo "$URL"
else
  report "ALL_FAILED: no transport worked; last cf log: $(journalctl -u cfquick -n 20 --no-pager 2>/dev/null | tail -6 | tr '\n' '|')"
  say "ALL_FAILED"
  exit 1
fi
