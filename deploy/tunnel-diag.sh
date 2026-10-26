#!/usr/bin/env bash
# Diagnose SSH tunnel providers: wait longer, capture raw output, verify page body.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
MARKER="svg-sprite"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
          -o ServerAliveInterval=20 -o ServerAliveCountMax=3
          -o ExitOnForwardFailure=yes -o BatchMode=yes -N)

say() { echo "[diag] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
logs() { journalctl -u webtun --since "$SINCE" --no-pager 2>/dev/null; }

start_svc() {
  systemctl stop webtun >/dev/null 2>&1
  systemctl reset-failed webtun >/dev/null 2>&1
  cat > /etc/systemd/system/webtun.service <<UNIT
[Unit]
Description=Outbound SSH web tunnel for the PWA
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
Environment=HOME=/root
ExecStart=$1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable webtun >/dev/null 2>&1
  SINCE=$(date '+%Y-%m-%d %H:%M:%S')
  systemctl start webtun >/dev/null 2>&1
}

verify() {
  local url="$1" body code
  body=$(curl -sL -m 25 "$url/" 2>/dev/null)
  if printf '%s' "$body" | grep -q "$MARKER"; then echo "OK"; return 0; fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$url/" 2>/dev/null)
  echo "BAD(${code:-ERR})"
  return 1
}

try_variant() {
  local label="$1" cmd="$2" pattern="$3" rounds="$4" url="" res i
  say "variant $label"
  start_svc "$cmd"
  for i in $(seq 1 "$rounds"); do
    url=$(logs | grep -oE "$pattern" | head -1)
    [ -n "$url" ] && break
    sleep 3
  done
  if [ -z "$url" ]; then
    say "$label: no url"
    report "diag[$label] NO_URL :: $(logs | tail -6 | tr '\n' '|' | cut -c1-800)"
    return 1
  fi
  sleep 4
  res=$(verify "$url")
  say "$label: $url -> $res"
  report "diag[$label] $url -> $res"
  [ "$res" = "OK" ] || return 1
  echo "$url" > /tmp/winner_url
  echo "$label" > /tmp/winner_label
  return 0
}

# ------------------------------------------------------------- preflight
systemctl is-active --quiet nginx || systemctl restart nginx >/dev/null 2>&1
LOCAL=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/ 2>/dev/null)
say "nginx local: ${LOCAL:-ERR}"
report "diag start: nginx ${LOCAL:-ERR}"
[ "$LOCAL" = "200" ] || { report "FATAL: nginx local ${LOCAL:-ERR}"; exit 1; }

rm -f /tmp/winner_url /tmp/winner_label
ok=0
SSH=$(command -v ssh || echo /usr/bin/ssh)

try_variant "localhost.run" \
  "$SSH ${SSH_OPTS[*]} -R 80:localhost:80 nokey@localhost.run" \
  'https://[a-z0-9-]+\.lhr\.life' 25 && ok=1

[ $ok -eq 1 ] || try_variant "pinggy" \
  "$SSH ${SSH_OPTS[*]} -p 443 -R 0:localhost:80 a.pinggy.io" \
  'https://[A-Za-z0-9.-]+\.(pinggy\.link|pinggy-free\.link|pinggy\.io)' 25 && ok=1

# ------------------------------------------------------------- result
if [ $ok -eq 1 ]; then
  URL=$(cat /tmp/winner_url)
  LB=$(cat /tmp/winner_label)
  report "DONE transport=$LB url=$URL check=OK"
  say "DONE $LB $URL"
  echo "$URL"
else
  systemctl stop webtun >/dev/null 2>&1
  report "ALL_FAILED diag: see NO_URL / BAD entries above"
  say "ALL_FAILED"
  exit 1
fi
