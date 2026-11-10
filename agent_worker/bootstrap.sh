#!/usr/bin/env bash
set -euo pipefail
umask 022

metadata() {
    curl --fail --silent --show-error --header 'Metadata-Flavor: Google' \
        "http://metadata.google.internal/computeMetadata/v1/instance/attributes/${1}"
}

release_tag="$(metadata agent-worker-tag)"
release_sha="$(metadata agent-worker-sha256)"
[[ "${release_tag}" =~ ^agent-worker-v[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1
[[ "${release_sha}" =~ ^[0-9a-f]{64}$ ]] || exit 1

if [[ -f /opt/zettly-agent/.release-sha256 ]] &&
    [[ "$(cat /opt/zettly-agent/.release-sha256)" == "${release_sha}" ]]; then
    if [[ "$(metadata agent-worker-enable)" == true ]]; then
        systemctl enable --now zettly-agent.service
    fi
    exit 0
fi

export DEBIAN_FRONTEND=noninteractive
# The stock security.ubuntu.com endpoint times out behind this VM's Cloud NAT;
# the regional GCE mirror serves the same signed noble-security repository.
sed -i 's#http://security.ubuntu.com/ubuntu#http://asia-southeast2.gce.archive.ubuntu.com/ubuntu#' /etc/apt/sources.list.d/ubuntu.sources
apt-get -o Acquire::http::Timeout=30 -o Acquire::Retries=2 update
apt-get install -y ca-certificates curl git gh npm php-cli php-mbstring php-xml php-curl php-zip php-sqlite3 php-gd composer unzip bubblewrap
sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 2>/dev/null || true
echo 'kernel.apparmor_restrict_unprivileged_userns=0' > /etc/sysctl.d/99-bubblewrap.conf 2>/dev/null || true
npm install --global n
n 22.16.0
npm install --global @openai/codex@0.167.0

# Ensure CLI binaries and shared node libraries are executable by unprivileged users
chmod -R a+rX /usr/local/bin /usr/local/lib/node_modules /usr/local/n /usr/local/include /usr/local/share /opt/zettly-agent 2>/dev/null || true

id zettly-agent >/dev/null 2>&1 || useradd --create-home --home-dir /home/zettly-agent --shell /bin/bash zettly-agent
install -d -m 0755 /opt/zettly-agent
install -d -m 0700 -o zettly-agent -g zettly-agent /srv/zettly-agent
install -d -m 0750 -o root -g zettly-agent /etc/zettly-agent
install -d -m 0750 -o zettly-agent -g zettly-agent /home/zettly-agent/.codex

cat >/home/zettly-agent/.codex/config.toml <<'EOF'
model_provider = "openai-custom"
model = "gpt-6-1-sol"

[model_providers.openai-custom]
name = "openai"
base_url = "https://kenari.id/v1"
env_key = "CODEX_API_KEY"
EOF
chown -R zettly-agent:zettly-agent /home/zettly-agent/.codex
chmod 0640 /home/zettly-agent/.codex/config.toml
runuser -u zettly-agent -- git config --global user.name "Zettly Coding Agent"
runuser -u zettly-agent -- git config --global user.email "technology@edmeeclinic.com"

archive="$(mktemp)"
trap 'rm -f "${archive}"' EXIT
curl --fail --silent --show-error --location --retry 3 \
    "https://github.com/programinglive/zettly/releases/download/${release_tag}/agent-worker.tar.gz" \
    --output "${archive}"
echo "${release_sha}  ${archive}" | sha256sum --check --status
tar -xzf "${archive}" --directory /opt/zettly-agent --no-same-owner
chmod -R a+rX /usr/local/bin /usr/local/lib/node_modules /usr/local/n /usr/local/include /usr/local/share /opt/zettly-agent
install -m 0644 -o root -g root /opt/zettly-agent/agent_worker/zettly-agent.service /etc/systemd/system/zettly-agent.service
install -m 0640 -o root -g zettly-agent /opt/zettly-agent/agent_worker/repositories.example.json /etc/zettly-agent/repositories.json
cat >/etc/zettly-agent/worker.env <<'EOF'
GOOGLE_CLOUD_PROJECT=phrasal-ground-377312
ZETTLY_URL=https://zettly.programinglive.com
AGENT_WORK_ROOT=/srv/zettly-agent
AGENT_REPOSITORIES_FILE=/etc/zettly-agent/repositories.json
AGENT_TARGET_ENVIRONMENT=staging
EOF
chown root:zettly-agent /etc/zettly-agent/worker.env
chmod 0640 /etc/zettly-agent/worker.env

# Verify that all required CLIs can be executed by the zettly-agent user
for cmd in node npm codex git gh php composer; do
    runuser -u zettly-agent -- ${cmd} --version >/dev/null
done

echo "${release_sha}" >/opt/zettly-agent/.release-sha256
systemctl daemon-reload
if [[ "$(metadata agent-worker-enable)" == true ]]; then
    systemctl enable --now zettly-agent.service
fi
