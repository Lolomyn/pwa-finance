#!/usr/bin/env bash
# Show whether the bot is receiving and answering updates.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
LOG_DIR="/root/.config/opencode-telegram-bot/logs"
say() { echo "[msg] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

say "journal (last 4 min)"
report "msg: journal :: $(journalctl -u opencode-bot --since '-4min' --no-pager 2>/dev/null | tr -d '\r' | grep -iE 'update|message|error|warn|model|session' | tail -10 | tr '\n' '|' | cut -c1-1500)"

LOG=$(ls -t "$LOG_DIR"/bot-*.log 2>/dev/null | head -1)
if [ -n "$LOG" ]; then
  say "log file: $LOG"
  report "msg: file :: $(tail -n 30 "$LOG" 2>/dev/null | tr -d '\r' | tr '\n' '|' | cut -c1-1500)"
else
  report "msg: no log file in $LOG_DIR"
fi

ERR=$(journalctl -u opencode-bot --since '-4min' --no-pager 2>/dev/null | grep -ciE 'error|unauthorized|409|conflict|failed' || true)
UPD=$(journalctl -u opencode-bot --since '-4min' --no-pager 2>/dev/null | grep -ciE 'update|message' || true)
say "errors=$ERR updates=$UPD"
report "msg: DONE errors=$ERR updates=$UPD"
echo "DONE errors=$ERR updates=$UPD"
