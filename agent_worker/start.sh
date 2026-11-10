#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${ZETTLY_URL:?ZETTLY_URL is required}"
: "${AGENT_REPOSITORIES_FILE:?AGENT_REPOSITORIES_FILE is required}"

export ZETTLY_WORKER_TOKEN
export GH_TOKEN
ZETTLY_WORKER_TOKEN="$(gcloud secrets versions access latest --secret=zettly-agent-worker-token --project="${GOOGLE_CLOUD_PROJECT}")"
GH_TOKEN="$(gcloud secrets versions access latest --secret=zettly-agent-github-token --project="${GOOGLE_CLOUD_PROJECT}")"

exec /usr/bin/python3 -m agent_worker
