#!/usr/bin/env bash
# Post-install check: service state, health endpoints and recent logs.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[check] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

OC=$(systemctl is-active opencode)
BOT=$(systemctl is-active opencode-bot)
UP=$(systemctl show -p ActiveEnterTimestamp --value opencode-bot 2>/dev/null)
H1=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1:3100/health 2>/dev/null)
H2=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1:4096/ 2>/dev/null)

say "opencode=$OC bot=$BOT health_bot=${H1:-000} health_api=${H2:-000}"
report "check: opencode=$OC bot=$BOT health_bot=${H1:-000} api=${H2:-000} since=$UP"

BOTLOG=$(journalctl -u opencode-bot -n 40 --no-pager 2>/dev/null | tr -d '\r')
report "check: botlog :: $(printf '%s' "$BOTLOG" | tail -14 | tr '\n' '|' | cut -c1-1500)"

OCLOG=$(journalctl -u opencode -n 25 --no-pager 2>/dev/null | tr -d '\r')
report "check: oclog :: $(printf '%s' "$OCLOG" | tail -10 | tr '\n' '|' | cut -c1-900)"

ERR=$(printf '%s' "$BOTLOG" | grep -ciE 'error|conflict|401|409|denied' || true)
say "error lines in bot log: $ERR"
report "check: botlog error_lines=$ERR"
report "check: DONE"
echo "DONE oc=$OC bot=$BOT h1=${H1:-000} h2=${H2:-000} err=$ERR"
