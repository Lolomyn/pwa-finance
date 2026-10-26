#!/usr/bin/env bash
# Final step: Telegram relay env, OpenCode server and bot services.
# The bot token is typed interactively (hidden) and never stored in the repository.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
WORKER="https://tg-relay.mr-fallen75.workers.dev"
ENV_DIR="/root/.config/opencode-telegram-bot"
ENV_FILE="$ENV_DIR/.env"

say() { echo "[bot] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

# 1) relay reachable from this server?
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 25 "$WORKER/bot123:abc/getMe" 2>/dev/null)
say "worker http: ${CODE:-000}"
report "bot: worker http=${CODE:-000}"
if [ "$CODE" != "401" ]; then
  report "bot: ABORT - relay not usable from server (http ${CODE:-000})"
  echo "ABORT relay http=${CODE:-000}"
  exit 1
fi

# 2) token
printf 'Вставьте токен бота (TELEGRAM_BOT_TOKEN) и нажмите Enter: '
read -rs TG_TOKEN < /dev/tty || { report "bot: ABORT - no tty"; exit 1; }
echo
TG_TOKEN=$(printf '%s' "$TG_TOKEN" | tr -d '[:space:]')
case "$TG_TOKEN" in
  *:*) ;;
  *) report "bot: ABORT - token format"; echo "bad token format"; exit 1 ;;
esac

ME=$(curl -s -m 30 "$WORKER/bot$TG_TOKEN/getMe" 2>/dev/null)
case "$ME" in
  *'"ok":true'*) say "token valid" ;;
  *) report "bot: ABORT getMe :: $(printf '%s' "$ME" | head -c 200)"; echo "getMe failed: $ME"; exit 1 ;;
esac
report "bot: token valid :: $(printf '%s' "$ME" | grep -oE '"username":"[^"]+"' | head -1)"

# 3) allowed user
printf 'Telegram user id (Enter = 367881716): '
read -r TG_UID < /dev/tty || TG_UID=""
TG_UID=$(printf '%s' "${TG_UID:-}" | tr -d '[:space:]')
[ -n "$TG_UID" ] || TG_UID="367881716"

# 4) env file
mkdir -p "$ENV_DIR"
umask 077
cat > "$ENV_FILE" <<EOF
TELEGRAM_BOT_TOKEN=$TG_TOKEN
TELEGRAM_ALLOWED_USER_ID=$TG_UID
TELEGRAM_API_ROOT=$WORKER
OPENCODE_SERVER_VERSION=v2
OPENCODE_API_URL=http://127.0.0.1:4096
OPENCODE_MODEL_PROVIDER=opencode
OPENCODE_MODEL_ID=deepseek-v4.1-flash-free
BOT_LOCALE=ru
BOT_HEALTH_PORT=3100
TRACK_BACKGROUND_SESSIONS=true
MESSAGE_FORMAT_MODE=markdown
CODE_FILE_MAX_SIZE_KB=100
LOG_LEVEL=info
OPENCODE_AUTO_RESTART_ENABLED=true
EOF
chmod 600 "$ENV_FILE"
say "env written: $ENV_FILE"

# 5) systemd units
cat > /etc/systemd/system/opencode.service <<'UNIT'
[Unit]
Description=OpenCode V2 server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment=HOME=/root
ExecStart=/usr/bin/opencode serve --hostname 127.0.0.1 --port 4096
Restart=always
RestartSec=5
KillMode=mixed

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/opencode-bot.service <<'UNIT'
[Unit]
Description=OpenCode Telegram bot
After=network-online.target opencode.service
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment=HOME=/root
EnvironmentFile=/root/.config/opencode-telegram-bot/.env
ExecStart=/usr/bin/opencode-telegram start
Restart=always
RestartSec=5
KillMode=mixed

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable opencode >/dev/null 2>&1
systemctl enable opencode-bot >/dev/null 2>&1
systemctl restart opencode >/dev/null 2>&1
sleep 6
systemctl restart opencode-bot >/dev/null 2>&1
sleep 10

OC=$(systemctl is-active opencode)
BOT=$(systemctl is-active opencode-bot)
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1:3100/health 2>/dev/null)
say "opencode=$OC bot=$BOT health=${HEALTH:-000}"
report "bot: services opencode=$OC bot=$BOT health=${HEALTH:-000}"

if [ "$BOT" != "active" ]; then
  report "bot: bot log :: $(journalctl -u opencode-bot -n 12 --no-pager 2>/dev/null | tr '\n' '|' | cut -c1-900)"
fi
if [ "$OC" != "active" ]; then
  report "bot: opencode log :: $(journalctl -u opencode -n 12 --no-pager 2>/dev/null | tr '\n' '|' | cut -c1-900)"
fi

report "bot: DONE opencode=$OC bot=$BOT"
echo "DONE opencode=$OC bot=$BOT health=${HEALTH:-000}"
