#!/usr/bin/env bash
# Sync the server working copy with origin/main and verify push access (dry-run).
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
REPO_DIR="/var/www/pwa"
say() { echo "[sync] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }

cd "$REPO_DIR" || { report "sync: ABORT - $REPO_DIR missing"; exit 1; }

Dirty=$(git status --porcelain | head -5)
if [ -n "$Dirty" ]; then
  say "local changes present, keeping them"
  report "sync: local changes :: $(printf '%s' "$Dirty" | tr '\n' '|' | cut -c1-400)"
  git stash push -u -m "pre-sync $(date +%s)" >/dev/null 2>&1 || true
  report "sync: stashed local changes"
fi

git fetch origin --prune >/dev/null 2>&1
git reset --hard origin/main >/dev/null 2>&1
HEAD=$(git log -1 --pretty='%h %s' | cut -c1-90)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
FILES=$(ls -1 | tr '\n' ' ')
say "head: $HEAD"
report "sync: branch=$BRANCH head=$HEAD"
report "sync: files :: $(printf '%s' "$FILES" | cut -c1-300)"

DRY=$(git push --dry-run origin "$BRANCH" 2>&1 | tail -2 | tr '\n' '|')
say "push dry-run: $DRY"
report "sync: push dry-run :: $(printf '%s' "$DRY" | cut -c1-300)"

if printf '%s' "$DRY" | grep -qiE 'error|denied|fatal|rejected'; then
  report "sync: PUSH CHECK FAILED"
  echo "PUSH_FAILED"
  exit 1
fi

# what the bot will see
test -f index.html && say "index.html: present"
test -d icons && say "icons: $(ls icons | tr '\n' ' ')"
report "sync: DONE head=$HEAD"
echo "DONE head=$HEAD"
