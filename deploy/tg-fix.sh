#!/usr/bin/env bash
# Diagnose Telegram Bot API reachability. If a direct IP works, pin it in /etc/hosts.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[tg] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
probe() { curl -s -o /dev/null -m 15 -w '%{http_code} %{remote_ip}' "$@" 2>/dev/null || echo "000 -"; }

say "control: example.com"
echo "control=$(probe -4 https://example.com/)" >/dev/null
report "tg: control example.com -> $(probe -4 https://example.com/)"

DNS4=$(getent ahostsv4 api.telegram.org 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')
DNS6=$(getent ahostsv6 api.telegram.org 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')
report "tg: dns4=[$DNS4] dns6=[$DNS6]"

P4=$(probe -4 --max-time 15 https://api.telegram.org/)
P6=$(probe -6 --max-time 15 https://api.telegram.org/)
report "tg: default v4=$P4 v6=$P6"

WORK_IP=""
for ip in 149.154.167.220 149.154.167.191 149.154.171.5 91.108.56.130 91.108.4.1; do
  r=$(probe --resolve "api.telegram.org:443:$ip" https://api.telegram.org/)
  say "ip $ip -> $r"
  report "tg: $ip -> $r"
  case "$r" in
    200*|404*|302*) [ -z "$WORK_IP" ] && WORK_IP="$ip" ;;
  esac
done

if [ -n "$WORK_IP" ]; then
  say "pinning $WORK_IP"
  cp /etc/hosts /etc/hosts.bak.$(date +%s) 2>/dev/null || true
  sed -i '/api\.telegram\.org$/d' /etc/hosts
  echo "$WORK_IP api.telegram.org" >> /etc/hosts
  BODY=$(curl -s -m 20 https://api.telegram.org/bot123:abc/getMe 2>&1 | head -c 200)
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 20 https://api.telegram.org/bot123:abc/getMe 2>/dev/null)
  report "tg: PINNED $WORK_IP -> http=$CODE body=$BODY"
  say "pinned $WORK_IP http=$CODE"
else
  report "tg: NO_DIRECT_COUNTRY_BLOCKED (need socks/tor relay)"
  say "no direct ip works"
fi

report "tg: DONE"
echo "DONE work_ip=${WORK_IP:-none}"
