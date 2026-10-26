#!/usr/bin/env bash
# Choose a tunnel that survives repeated requests: pyjam.as, then pinggy, then localhost.run.
# For each candidate, issue 6 requests spread over 60 s and require at least 5 to hit the app.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
MARKER="svg-sprite"
say() { echo "[v2] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
logs() { journalctl -u webtun --since "$SINCE" --no-pager 2>/dev/null; }

SSH_BIN=$(command -v ssh || echo /usr/bin/ssh)
SCRIPT_BIN=$(command -v script || echo /usr/bin/script)

OPTS="-tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
-o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes \
-o ExitOnForwardFailure=yes -o BatchMode=yes"

start_svc() {
  local inner="$1"
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
Environment=TERM=xterm
ExecStart=$SCRIPT_BIN -qfc "$inner" /dev/null
Restart=on-failure
RestartSec=3
KillMode=mixed

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable webtun >/dev/null 2>&1
  SINCE=$(date '+%Y-%m-%d %H:%M:%S')
  systemctl start webtun >/dev/null 2>&1
}

hit() { # url -> OK | NO_TUNNEL | BAD(code)
  local url="$1" body code
  body=$(curl -sL -m 20 "$url/" 2>/dev/null)
  if printf '%s' "$body" | grep -q "$MARKER"; then echo "OK"; return 0; fi
  if printf '%s' "$body" | grep -qi "no tunnel"; then echo "NO_TUNNEL"; return 1; fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$url/" 2>/dev/null)
  echo "BAD${code:+($code)}"
  return 1
}

try_variant() {
  local label="$1" inner="$2" pattern="$3" rounds="$4"
  local url="" i good=0 res active
  say "variant $label"
  start_svc "$inner"
  for i in $(seq 1 "$rounds"); do
    url=$(logs | grep -oE "$pattern" | head -1)
    [ -n "$url" ] && break
    sleep 3
  done
  if [ -z "$url" ]; then
    say "$label: no url"
    report "v2[$label] NO_URL :: $(logs | tail -6 | tr -d '\r' | tr '\n' '|' | cut -c1-700)"
    return 1
  fi
  say "$label url $url"
  for i in $(seq 1 6); do
    res=$(hit "$url")
    [ "$res" = "OK" ] && good=$((good+1))
    [ $i -eq 1 ] && report "v2[$label] $url req1=$res"
    sleep 10
  done
  active=$(systemctl is-active webtun)
  say "$label: $url good=$good/6 active=$active"
  report "v2[$label] $url good=$good/6 active=$active"
  if [ $good -ge 5 ]; then
    echo "$url" > /tmp/winner_url
    echo "$label" > /tmp/winner_label
    return 0
  fi
  return 1
}

# ------------------------------------------------------------- preflight
systemctl is-active --quiet nginx || systemctl restart nginx >/dev/null 2>&1
LOCAL=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/ 2>/dev/null)
say "nginx local: ${LOCAL:-ERR}"
report "v2 start: nginx ${LOCAL:-ERR}"
[ "$LOCAL" = "200" ] || { report "FATAL: nginx local ${LOCAL:-ERR}"; exit 1; }

rm -f /tmp/winner_url /tmp/winner_label
ok=0

try_variant "pyjam.as" \
  "$SSH_BIN $OPTS -R 80:localhost:80 tunnel.pyjam.as" \
  'https://[A-Za-z0-9.-]+\.tunnel\.pyjam\.as' 25 && ok=1

[ $ok -eq 1 ] || try_variant "pinggy" \
  "$SSH_BIN $OPTS -p 443 -R 0:localhost:80 a.pinggy.io" \
  'https://[A-Za-z0-9.-]+\.(pinggy\.link|pinggy-free\.link|pinggy\.io|pinggy\.network)' 25 && ok=1

[ $ok -eq 1 ] || try_variant "localhost.run" \
  "$SSH_BIN $OPTS -R 80:localhost:80 nokey@localhost.run" \
  'https://[a-z0-9-]+\.lhr\.life' 25 && ok=1

# ------------------------------------------------------------- result
if [ $ok -eq 1 ]; then
  URL=$(cat /tmp/winner_url)
  LB=$(cat /tmp/winner_label)
  report "DONE transport=$LB url=$URL check=OK"
  say "DONE $LB $URL"
  echo "$URL"
else
  report "ALL_FAILED v2: see v2[...] entries above"
  say "ALL_FAILED"
  exit 1
fi
