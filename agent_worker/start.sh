#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${ZETTLY_URL:?ZETTLY_URL is required}"
: "${AGENT_REPOSITORIES_FILE:?AGENT_REPOSITORIES_FILE is required}"

access_secret() {
    local token
    token="$(curl --fail --silent --show-error --header 'Metadata-Flavor: Google' \
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' \
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
    curl --fail --silent --show-error \
        --header "Authorization: Bearer ${token}" \
        "https://secretmanager.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT}/secrets/${1}/versions/latest:access" \
        | python3 -c 'import base64,json,sys; sys.stdout.buffer.write(base64.b64decode(json.load(sys.stdin)["payload"]["data"]))'
}

export ZETTLY_WORKER_TOKEN
export GH_TOKEN
ZETTLY_WORKER_TOKEN="$(access_secret zettly-agent-worker-token)"
GH_TOKEN="$(access_secret zettly-agent-github-token)"
openai_key="$(access_secret zettly-agent-openai-api-key)"
printf '%s' "${openai_key}" | codex login --with-api-key >/dev/null
export CODEX_API_KEY="${openai_key}"
unset openai_key

git config --global user.name "Zettly Coding Agent"
git config --global user.email "technology@edmeeclinic.com"

exec /usr/bin/python3 -m agent_worker
