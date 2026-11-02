# graph-service

Node/Express service that backs the `/graph` page. Laravel pushes todo nodes and
links here over HTTP; the browser reads the graph over HTTP and subscribes to
live changes over WebSocket.

It keeps the whole graph **in memory** — there is no database. That has one
consequence worth remembering: after the process restarts, the graph is empty
until something pushes the todos back in. `start.sh` does that automatically.

## Run it locally

```bash
cd graph-service
npm install
npm run dev            # tsx watch src/index.ts, listens on :3001
```

Then set `GRAPH_SERVICE_URL=http://localhost:3001` in the Laravel `.env` (it is
the default) and open `/graph`.

## Run it in production

```bash
npm ci
npm run build          # tsc -> dist/
bash start.sh          # starts node, then runs `php artisan graph:sync`
```

`start.sh` is what supervisor runs:

```
[program:zettly-graph]
command=/bin/bash /var/www/zettly/graph-service/start.sh
directory=/var/www/zettly/graph-service
user=www-data
environment=NODE_ENV="production",PORT="3001"
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
```

nginx proxies the two public entry points, so the browser never talks to `:3001`:

```
location /graph-ws  { proxy_pass http://localhost:3001; ... }   # Upgrade headers
location /graph-api/ { proxy_pass http://localhost:3001/; }
```

Those paths are what `GRAPH_API_URL` and `GRAPH_WS_URL` in the Laravel `.env`
must contain. Both are optional: when unset, the page falls back to
`GRAPH_SERVICE_URL` and derives the WebSocket scheme from it.

## Endpoints

| Method | Path      | Purpose                                              |
|--------|-----------|------------------------------------------------------|
| GET    | `/health` | Liveness, plus the number of connected WS clients    |
| GET    | `/graph`  | Full graph; `?center=<id>&depth=<n>` for a subgraph  |
| POST   | `/sync`   | `node:add`, `node:update`, `node:remove`, `edge:add`, `edge:remove`, `bulk:sync` |

## Tests

```bash
npm test               # vitest
```
