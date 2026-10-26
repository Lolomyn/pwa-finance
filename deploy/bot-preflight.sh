#!/usr/bin/env bash
# Preflight for the Telegram bot + OpenCode server: installs Node.js 22 and both CLIs,
# reports versions, server flags and Telegram API reachability to ntfy.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[pre] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

export DEBIAN_FRONTEND=noninteractive

say "apt base packages"
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq curl ca-certificates git gnupg >/dev/null 2>&1

say "node 22"
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  MAJ=$(node -v | sed 's/^v//' | cut -d. -f1)
  [ "${MAJ:-0}" -ge 20 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = "1" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh >/dev/null 2>&1 \
    && bash /tmp/nodesource.sh >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null 2>&1
fi
NODE_V=$(node -v 2>&1 | tail -1)
NPM_V=$(npm -v 2>&1 | tail -1)
say "node=$NODE_V npm=$NPM_V"
report "pre: node=$NODE_V npm=$NPM_V"

say "npm packages"
npm install -g @opencode/cli >/tmp/npm-oc.log 2>&1; OC_RC=$?
npm install -g @grinev/opencode-telegram-bot >/tmp/npm-bot.log 2>&1; BOT_RC=$?
say "npm rc: opencode=$OC_RC bot=$BOT_RC"
report "pre: npm opencode rc=$OC_RC bot rc=$BOT_RC"
[ "$OC_RC" = "0" ] || report "pre: npm opencode log :: $(tail -6 /tmp/npm-oc.log | tr '\n' '|' | cut -c1-600)"
[ "$BOT_RC" = "0" ] || report "pre: npm bot log :: $(tail -6 /tmp/npm-bot.log | tr '\n' '|' | cut -c1-600)"

OC_PATH=$(command -v opencode || echo none)
BOT_PATH=$(command -v opencode-telegram || echo none)
OC_V=$(opencode --version 2>&1 | tail -1)
report "pre: opencode=$OC_PATH ver=$OC_V bot=$BOT_PATH"

say "serve flags"
HELP=$(opencode serve --help 2>&1 | head -30)
report "pre: serve help :: $(printf '%s' "$HELP" | tr '\n' '|' | cut -c1-1200)"

say "telegram reachability"
TG_ROOT=$(curl -s -o /dev/null -w '%{http_code}' -m 20 https://api.telegram.org/ 2>&1)
TG_BODY=$(curl -s -m 20 https://api.telegram.org/bot123:abc/getMe 2>&1 | head -c 200)
DNS=$(getent hosts api.telegram.org 2>&1 | head -2 | tr '\n' ' ')
say "tg root=$TG_ROOT dns=$DNS"
report "pre: tg root=$TG_ROOT dns=$DNS body=$TG_BODY"

say "done"
report "pre: DONE"
echo "DONE node=$NODE_V opencode=$OC_V tg=$TG_ROOT"
