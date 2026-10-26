#!/usr/bin/env bash
# Last account-free attempt: Psiphon tunnel core as a local SOCKS5 proxy for Telegram.
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[psiphon] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
export DEBIAN_FRONTEND=noninteractive

code_via() { # port
  curl -s -o /dev/null -w '%{http_code}' -m 12 --socks5-hostname "127.0.0.1:$1" \
    https://api.telegram.org/bot123:abc/getMe 2>/dev/null
}

# already solved by an earlier attempt?
for p in 9050 9051; do
  c=$(code_via "$p")
  case "$c" in 404|401|200)
    say "port $p already works (http $c)"
    report "psiphon: SKIP - socks $p already works http=$c"
    echo "DONE existing:$p"
    exit 0 ;;
  esac
done

say "download psiphon"
mkdir -p /opt/psiphon
if ! curl -fsSL -o /opt/psiphon/psiphon \
  https://github.com/Psiphon-Labs/psiphon-tunnel-core-binaries/raw/master/linux/psiphon-tunnel-core-x86_64; then
  report "psiphon: download failed"
  echo "FAILED download"
  exit 1
fi
chmod +x /opt/psiphon/psiphon
say "size: $(stat -c %s /opt/psiphon/psiphon)"

cat > /etc/psiphon.config <<'CFG'
{
  "LocalSocksProxyPort": 9051,
  "PropagationChannelId": "0000000000000000",
  "SponsorId": "0000000000000000",
  "EgressRegion": ""
}
CFG

cat > /etc/systemd/system/psiphon.service <<'UNIT'
[Unit]
Description=Psiphon tunnel core (local SOCKS proxy for Telegram)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/opt/psiphon/psiphon -config /etc/psiphon.config
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable psiphon >/dev/null 2>&1
systemctl stop psiphon >/dev/null 2>&1
systemctl reset-failed psiphon >/dev/null 2>&1
systemctl start psiphon >/dev/null 2>&1

say "waiting for tunnel"
for i in $(seq 1 24); do
  sleep 5
  c=$(code_via 9051)
  case "$c" in 404|401|200)
    say "telegram reachable via psiphon (http $c) after $((i*5))s"
    report "psiphon: DONE socks5://127.0.0.1:9051 http=$c in $((i*5))s"
    echo "DONE psiphon"
    exit 0 ;;
  esac
  if [ $((i % 4)) -eq 0 ]; then
    say "  ${i} x5s code=${c:-000}"
    report "psiphon: $((i*5))s code=${c:-000}"
  fi
done

TAIL=$(journalctl -u psiphon -n 6 --no-pager 2>/dev/null | tr '\n' '|' | cut -c1-700)
report "psiphon: FAILED :: $TAIL"
say "FAILED"
echo "FAILED"
exit 1
