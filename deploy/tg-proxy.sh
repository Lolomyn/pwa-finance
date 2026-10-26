#!/usr/bin/env bash
# Provide a local SOCKS5 proxy for the Telegram Bot API.
# 1) plain Tor, 2) Tor over Snowflake bridges (anti-censorship).
set -uo pipefail

TOPIC="oc-f2ic-deploy-7k2m"
say() { echo "[proxy] $*"; }
report() { curl -s --max-time 10 --data-binary "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
export DEBIAN_FRONTEND=noninteractive

tg_code() {
  curl -s -o /dev/null -w '%{http_code}' -m 12 --socks5-hostname 127.0.0.1:9050 \
    https://api.telegram.org/bot123:abc/getMe 2>/dev/null
}

bootstrap_pct() {
  journalctl -u tor --since "-3min" --no-pager 2>/dev/null \
    | grep -oE 'Bootstrapped [0-9]+%' | tail -1
}

wait_proxy() {
  local label="$1" rounds="$2" i code pct
  for i in $(seq 1 "$rounds"); do
    sleep 5
    code=$(tg_code)
    if [ "$code" = "404" ] || [ "$code" = "401" ] || [ "$code" = "200" ]; then
      say "$label: telegram reachable (http $code)"
      report "proxy[$label] OK http=$code after $((i*5))s"
      return 0
    fi
    if [ $((i % 6)) -eq 0 ]; then
      pct=$(bootstrap_pct)
      say "$label: ${i}0% ... ${pct:-no bootstrap info} code=$code"
      report "proxy[$label] $((i*5))s ${pct:-no-info} code=${code:-000}"
    fi
  done
  return 1
}

say "install tor"
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq tor >/dev/null 2>&1
systemctl enable tor >/dev/null 2>&1

say "stage 1: plain tor"
systemctl restart tor >/dev/null 2>&1
if wait_proxy "plain-tor" 24; then
  report "proxy: DONE plain-tor socks5://127.0.0.1:9050"
  echo "DONE plain-tor"
  exit 0
fi

say "stage 2: snowflake"
apt-get install -y -qq snowflake-client obfs4proxy >/dev/null 2>&1
SNOW=$(command -v snowflake-client || echo /usr/bin/snowflake-client)
if [ ! -x "$SNOW" ]; then
  report "proxy: snowflake-client missing"
else
  cat > /etc/tor/torrc <<EOF
SocksPort 127.0.0.1:9050
DataDirectory /var/lib/tor
UseBridges 1
ClientTransportPlugin snowflake exec $SNOW
Bridge snowflake 192.0.2.3:1 2B280B23E1107BB62ABFC40DDCC8824814F80A72 url=https://snowflake-broker.torproject.net/ fronts=www.facebook.com,www.bing.com ice=stun:stun.l.google.com:19302,stun:stun.voipbuster.com:3478
EOF
  systemctl stop tor >/dev/null 2>&1
  systemctl reset-failed tor >/dev/null 2>&1
  systemctl start tor >/dev/null 2>&1
  if wait_proxy "snowflake" 36; then
    report "proxy: DONE snowflake socks5://127.0.0.1:9050"
    echo "DONE snowflake"
    exit 0
  fi
fi

TAIL=$(journalctl -u tor -n 8 --no-pager 2>/dev/null | tr '\n' '|' | cut -c1-700)
report "proxy: FAILED :: $TAIL"
say "FAILED"
echo "FAILED"
exit 1
