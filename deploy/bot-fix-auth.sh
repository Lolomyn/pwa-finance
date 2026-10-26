#!/usr/bin/env bash
# Sync the OpenCode server password into the bot config and restart both.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
ENV_FILE="/root/.config/opencode-telegram-bot/.env"
say() { echo "[auth] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

pass_from_log() {
  journalctl -u opencode --no-pager 2>/dev/null | grep -oE 'server password [^ ]+' | tail -1 | awk '{print $2}'
}

code() { curl -s -o /dev/null -w '%{http_code}' -m 8 "$@" 2>/dev/null; }

P0=$(pass_from_log)
say "current server password: ${P0:+found}"
report "auth: password_in_log=$([ -n "$P0" ] && echo yes || echo no)"

N0=$(code http://127.0.0.1:4096/)
A0=$(code -u "opencode:$P0" http://127.0.0.1:4096/)
A1=$(code -u "root:$P0" http://127.0.0.1:4096/)
say "api codes: noauth=$N0 opencode=$A0 root=$A1"
report "auth: api codes noauth=${N0:-000} user_opencode=${A0:-000} user_root=${A1:-000}"

# make the password stable across restarts
if ! grep -q '^Environment=OPENCODE_SERVER_PASSWORD=' /etc/systemd/system/opencode.service; then
  sed -i "/^\[Service\]/a Environment=OPENCODE_SERVER_PASSWORD=$P0" /etc/systemd/system/opencode.service
  say "unit updated with fixed password"
fi
systemctl daemon-reload
systemctl restart opencode >/dev/null 2>&1
sleep 8

P1=$(pass_from_log)
say "password after restart: $([ "$P1" = "$P0" ] && echo stable || echo rotated)"
report "auth: password_after_restart=$([ "$P1" = "$P0" ] && echo stable || echo rotated)"
[ -n "$P1" ] || P1="$P0"

AC=$(code -u "opencode:$P1" http://127.0.0.1:4096/)
say "api after restart: ${AC:-000}"
report "auth: api after restart=${AC:-000}"

# write credentials into the bot env
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"
sed -i '/^OPENCODE_SERVER_USERNAME=/d; /^OPENCODE_SERVER_PASSWORD=/d' "$ENV_FILE"
{
  echo "OPENCODE_SERVER_USERNAME=opencode"
  echo "OPENCODE_SERVER_PASSWORD=$P1"
} >> "$ENV_FILE"

systemctl restart opencode-bot >/dev/null 2>&1
sleep 14

BOT=$(systemctl is-active opencode-bot)
H=$(code http://127.0.0.1:3100/health)
say "bot=$BOT health=${H:-000}"
report "auth: bot=$BOT health=${H:-000}"

LOG=$(journalctl -u opencode-bot --since "-40s" --no-pager 2>/dev/null | tr -d '\r' | tail -12 | tr '\n' '|')
report "auth: botlog :: $(printf '%s' "$LOG" | cut -c1-1400)"

ERRS=$(journalctl -u opencode-bot --since "-40s" --no-pager 2>/dev/null | grep -ciE 'error|unauthorized|401' || true)
say "errors: $ERRS"
report "auth: DONE bot=$BOT health=${H:-000} errors=$ERRS"
echo "DONE bot=$BOT health=${H:-000} errors=$ERRS"
