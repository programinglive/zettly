#!/usr/bin/env bash
#
# Runs the graph service and re-seeds it after every (re)start.
#
# The service keeps the graph in memory, so a restart — crash, deploy or reboot —
# leaves it with an empty node list and the /graph page renders zero todos until
# someone remembers to run `php artisan graph:sync`. Doing it here means the
# graph is repopulated whichever way the process comes back up.
#
set -u

GRAPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$GRAPH_DIR")"
PORT="${PORT:-3001}"

cd "$GRAPH_DIR" || exit 1

node dist/index.js &
NODE_PID=$!

shutdown() {
    kill -TERM "$NODE_PID" 2>/dev/null || true
    wait "$NODE_PID" 2>/dev/null || true
    exit 0
}
trap shutdown TERM INT

# Wait for the service to accept requests, then push the current todos in.
for _ in $(seq 1 30); do
    if curl -sf -m 2 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
        echo "[start.sh] graph service is up, syncing todos"
        php "$APP_DIR/artisan" graph:sync || echo "[start.sh] graph:sync failed; graph may be stale"
        break
    fi
    sleep 1
done

wait "$NODE_PID"
