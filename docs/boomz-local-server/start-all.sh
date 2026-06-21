#!/bin/bash
# Start the three DDTank 3.0 (Boomz) servers in the correct dependency order.
#
# Order matters:
#   1. Center   - login/WCF host. Road makes WCF calls to it (net.tcp:2009),
#                 so Center MUST be fully up before Road starts.
#   2. Fighting - battle server. Road registers it as a battle backend (9208).
#   3. Road     - game world. Connects to Center (WCF) and Fighting on startup.
#
# Each server is launched under `script` to give it a pseudo-TTY, otherwise
# Console.ReadLine() returns null on EOF and the REPL crash-loops.
#
# Usage: ./start-all.sh

set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"

# port_up <port> : returns 0 if something is LISTENing on <port> (IPv4)
port_up() {
  python3 - "$1" <<'PY'
import sys
want = int(sys.argv[1])
for fn in ('/proc/net/tcp', '/proc/net/tcp6'):
    try:
        with open(fn) as f:
            for line in f.readlines()[1:]:
                p = line.split()
                if p[3] == '0A' and int(p[1].split(':')[1], 16) == want:
                    sys.exit(0)
    except FileNotFoundError:
        pass
sys.exit(1)
PY
}

# wait_port <port> <name> <timeout_s>
wait_port() {
  local port="$1" name="$2" timeout="${3:-30}"
  for ((i=0; i<timeout; i++)); do
    if port_up "$port"; then
      echo "  [OK]   $name listening on $port (after ${i}s)"
      return 0
    fi
    sleep 1
  done
  echo "  [FAIL] $name did NOT come up on $port within ${timeout}s"
  return 1
}

start_server() {
  local dir="$1" exe="$2" log="$3"
  ( cd "$ROOT/$dir" && script -q -c "mono $exe" "$log" >/dev/null 2>&1 & )
}

echo "=== Starting Center ==="
start_server center Center.Service.exe /tmp/center.log
wait_port 9202 "Center game"     40 || exit 1
wait_port 2009 "Center WCF tcp"  20 || exit 1

echo "=== Starting Fighting ==="
start_server fighting Fighting.Service.exe /tmp/fighting.log
wait_port 9208 "Fighting battle" 40 || exit 1

echo "=== Starting Road ==="
start_server road Road.Service.exe /tmp/road.log
wait_port 9210 "Road game"       40 || exit 1

echo ""
echo "=== All servers up ==="
for p in 9202 2008 2009 9208 9210; do
  port_up "$p" && echo "  port $p : LISTEN"
done
