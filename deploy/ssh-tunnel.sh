#!/usr/bin/env bash
# Publish the PWA through an SSH-based outbound tunnel (no inbound ports needed).
# Tries serveo -> localhost.run -> pinggy, verifies the page body, reports to ntfy.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
MARKER="svg-sprite"          # unique ASCII marker from index.html
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
          -o ServerAliveInterval=20 -o ServerAliveCountMax=3
          -o ExitOnForwardFailure=yes -o BatchMode=yes -N)

say() { echo "[webtun] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

verify() {
  local url="$1" body code
  body=$(curl -sL -m 25 "$url/" 2>/dev/null)
  if printf '%s' "$body" | grep -q "$MARKER"; then
    echo "OK"
    return 0
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$url/" 2>/dev/null)
  echo "BAD${code:+($code)}"
  return 1
}

start_ssh() {
  local cmd="$1" regex="$2" since url
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
ExecStart=$cmd
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable webtun >/dev/null 2>&1
  since=$(date '+%Y-%m-%d %H:%M:%S')
  systemctl start webtun >/dev/null 2>&1
  url=""
  for _ in $(seq 1 20); do
    url=$(journalctl -u webtun --since "$since" --no-pager 2>/dev/null | grep -oE "$regex" | tail -1)
    [ -n "$url" ] && break
    sleep 2
  done
  echo "$url"
}

attempt() {
  local label="$1" cmd="$2" regex="$3" url res
  say "try $label"
  url=$(start_ssh "$cmd" "$regex")
  if [ -z "$url" ]; then
    say "$label: no url"
    report "tun[$label] no url: $(journalctl -u webtun -n 6 --no-pager 2>/dev/null | tail -3 | tr '\n' '|' | cut -c1-300)"
    return 1
  fi
  res=$(verify "$url")
  say "$label: $url -> $res"
  report "tun[$label] $url -> $res"
  [ "$res" = "OK" ] || return 1
  echo "$url" > /tmp/winner_url
  echo "$label" > /tmp/winner_label
  return 0
}

# ---------------------------------------------------------------- preflight
systemctl disable --now cfquick >/dev/null 2>&1 || true
systemctl is-active --quiet nginx || systemctl restart nginx >/dev/null 2>&1
LOCAL=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/ 2>/dev/null)
say "nginx local: ${LOCAL:-ERR}"
report "ssh-tunnel start: nginx ${LOCAL:-ERR}"
[ "$LOCAL" = "200" ] || { report "FATAL: nginx local ${LOCAL:-ERR}"; exit 1; }

rm -f /tmp/winner_url /tmp/winner_label
ok=0

SSH=$(command -v ssh || echo /usr/bin/ssh)

attempt "serveo-pwa" \
  "$SSH ${SSH_OPTS[*]} -R pwa-finance:80:localhost:80 serveo.net" \
  'https://[a-z0-9-]+\.serveo\.net' && ok=1

[ $ok -eq 1 ] || attempt "serveo" \
  "$SSH ${SSH_OPTS[*]} -R 80:localhost:80 serveo.net" \
  'https://[a-z0-9-]+\.serveo\.net' && ok=1

[ $ok -eq 1 ] || attempt "localhost.run" \
  "$SSH ${SSH_OPTS[*]} -R 80:localhost:80 nokey@localhost.run" \
  'https://[a-z0-9-]+\.lhr\.life' && ok=1

[ $ok -eq 1 ] || attempt "pinggy" \
  "$SSH ${SSH_OPTS[*]} -p 443 -R 0:localhost:80 a.pinggy.io" \
  'https://[A-Za-z0-9.-]+\.pinggy[.-][a-z.]+' && ok=1

# ---------------------------------------------------------------- result
if [ $ok -eq 1 ]; then
  URL=$(cat /tmp/winner_url)
  LB=$(cat /tmp/winner_label)
  report "DONE transport=$LB url=$URL check=OK"
  say "DONE $LB $URL"
  echo "$URL"
else
  systemctl stop webtun >/dev/null 2>&1
  report "ALL_FAILED ssh: $(journalctl -u webtun -n 24 --no-pager 2>/dev/null | tail -8 | tr '\n' '|' | cut -c1-700)"
  say "ALL_FAILED"
  exit 1
fi
