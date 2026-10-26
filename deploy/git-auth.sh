#!/usr/bin/env bash
# Give the server push access to the GitHub repo (fine-grained PAT, stored locally only).
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
REPO_DIR="/var/www/pwa"
REPO="Lolomyn/pwa-finance"
say() { echo "[git] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

printf 'Вставьте GitHub fine-grained token (github_pat_...) и нажмите Enter: '
read -rs GH_TOKEN < /dev/tty || { report "git: ABORT - no tty"; exit 1; }
echo
GH_TOKEN=$(printf '%s' "$GH_TOKEN" | tr -d '[:space:]')

case "$GH_TOKEN" in
  github_pat_*|ghp_*) ;;
  *) report "git: ABORT - token prefix"; echo "bad prefix"; exit 1 ;;
esac

CODE=$(curl -s -o /tmp/ghrepo.json -w '%{http_code}' -m 25 \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO" 2>/dev/null)
say "api /repos/$REPO -> $CODE"
report "git: api repos http=$CODE"
if [ "$CODE" != "200" ]; then
  report "git: ABORT - token cannot read $REPO (http $CODE)"
  echo "ABORT api=$CODE"
  exit 1
fi

PERM=$(python3 -c "import json;d=json.load(open('/tmp/ghrepo.json'));print(d.get('permissions',{}))" 2>/dev/null || echo "{}")
say "permissions: $PERM"
report "git: repo permissions $PERM"

umask 077
printf 'https://x-access-token:%s@github.com\n' "$GH_TOKEN" > /root/.git-credentials
chmod 600 /root/.git-credentials
git config --global credential.helper store
git config --global user.name "OpenCode Bot"
git config --global user.email "opencode-bot@users.noreply.github.com"

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" remote set-url origin "https://github.com/$REPO.git"
  git -C "$REPO_DIR" config credential.helper store
  FETCH=$(git -C "$REPO_DIR" fetch origin --prune 2>&1 | tail -2 | tr '\n' '|')
  say "fetch: ${FETCH:-ok}"
  report "git: fetch ${FETCH:-ok}"
  BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)
  HEAD=$(git -C "$REPO_DIR" log -1 --pretty='%h %s' | cut -c1-80)
  report "git: branch=$BRANCH head=$HEAD"
else
  report "git: WARN - $REPO_DIR is not a git repo"
fi

# verify write access without changing anything
PUSH_TEST=$(git -C "$REPO_DIR" ls-remote origin refs/heads/main 2>&1 | head -1)
report "git: ls-remote ${PUSH_TEST:-empty}"

# GitHub identity that the token belongs to
WHO=$(curl -s -m 20 -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user 2>/dev/null \
      | grep -oE '"login": *"[^"]+"' | head -1)
report "git: token owner $WHO"

report "git: DONE"
say "done"
echo "DONE"
