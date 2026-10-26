#!/usr/bin/env bash
# Remove the tunnel/proxy experiments that are no longer needed.
# Keeps: nginx (optional local preview), opencode, opencode-bot.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[cleanup] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

for svc in cfquick webtun psiphon tor lhrun pinggytun serveotun boretun sshtunnel testhttp testhttp443 testhttp8080; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^$svc\.service"; then
    systemctl disable --now "$svc" >/dev/null 2>&1 || true
    systemctl reset-failed "$svc" >/dev/null 2>&1 || true
    say "stopped $svc"
  fi
done

# leftover units written by the experiments
rm -f /etc/systemd/system/cfquick.service /etc/systemd/system/webtun.service 2>/dev/null || true
rm -f /etc/systemd/system/psiphon.service /etc/psiphon.config 2>/dev/null || true
rm -f /usr/local/bin/bore 2>/dev/null || true
systemctl daemon-reload

say "remaining units"
STATE=$(systemctl is-active nginx opencode opencode-bot 2>/dev/null | tr '\n' ' ')
report "cleanup: nginx/opencode/opencode-bot = $STATE"

BROKEN=$(systemctl --failed --no-legend 2>/dev/null | awk '{print $1}' | tr '\n' ' ')
report "cleanup: failed units=[${BROKEN:-none}]"

PORT80=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1/ 2>/dev/null)
PORT4096=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1:4096/ 2>/dev/null)
PORT3100=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1:3100/health 2>/dev/null)
report "cleanup: health nginx80=${PORT80:-000} opencode=${PORT4096:-000} bot=${PORT3100:-000}"

report "cleanup: DONE"
say "done"
echo "DONE state=$STATE"
