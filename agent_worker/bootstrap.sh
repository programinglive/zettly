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
        systemctl enable zettly-agent.service
    fi
    if systemctl is-enabled --quiet zettly-agent.service || systemctl is-active --quiet zettly-agent.service; then
        systemctl restart zettly-agent.service
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
npm install --global @opencode/cli

# Codex is retired on this host. Remove the package, the shim, and every
# per-user configuration directory so no process can fall back to it.
npm uninstall --global @openai/codex >/dev/null 2>&1 || true
rm -f /usr/local/bin/codex
rm -rf /home/zettly-agent/.codex
rm -rf /root/.codex
rm -rf /home/dhika/.codex

# Ensure CLI binaries and shared node libraries are executable by unprivileged users
chmod -R a+rX /usr/local/bin /usr/local/lib/node_modules /usr/local/n /usr/local/include /usr/local/share /opt/zettly-agent 2>/dev/null || true

id zettly-agent >/dev/null 2>&1 || useradd --create-home --home-dir /home/zettly-agent --shell /bin/bash zettly-agent
install -d -m 0755 /opt/zettly-agent
install -d -m 0700 -o zettly-agent -g zettly-agent /srv/zettly-agent
install -d -m 0750 -o root -g zettly-agent /etc/zettly-agent
install -d -m 0750 -o zettly-agent -g zettly-agent /home/zettly-agent/.config/opencode

# OpenCode talks to Kenari.ID through the OpenAI-compatible runtime. The key is
# read from KENARI_API_KEY, which only the worker and its OpenCode child receive.
cat >/home/zettly-agent/.config/opencode/opencode.json <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "model": "kenari/claude-sonnet-5-5",
  "providers": {
    "kenari": {
      "name": "Kenari.ID",
      "env": ["KENARI_API_KEY"],
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "https://kenari.id/v1"
      },
      "models": {
        "claude-sonnet-5-5": {},
        "claude-opus-5-5": {},
        "gpt-6-1-sol": {},
        "kimi-k2-7-code": {},
        "qwen3-8-max": {},
        "deepseek-v4-pro": {},
        "glm-5-3": {},
        "gemini-3-8-flash": {},
        "minimax-m3": {},
        "north-mini-code:free": {}
      }
    }
  }
}
EOF
chown -R zettly-agent:zettly-agent /home/zettly-agent/.config
chmod 0640 /home/zettly-agent/.config/opencode/opencode.json
runuser -u zettly-agent -- git config --global user.name "Zettly Coding Agent"
runuser -u zettly-agent -- git config --global user.email "technology@edmeeclinic.com"

# Manual coding for the owner uses OpenCode and the Antigravity CLI, never Codex.
if id dhika >/dev/null 2>&1; then
    install -d -m 0755 -o dhika -g dhika /home/dhika/.config/opencode
    install -m 0644 -o dhika -g dhika /home/zettly-agent/.config/opencode/opencode.json /home/dhika/.config/opencode/opencode.json
    runuser -u dhika -- bash -lc 'curl -fsSL https://antigravity.google/cli/install.sh | bash' || true
    for profile in /home/dhika/.profile /home/dhika/.bashrc; do
        if [[ -f "${profile}" ]] && ! grep -q '/home/dhika/.local/bin' "${profile}"; then
            printf '\nexport PATH="/home/dhika/.local/bin:$PATH"\n' >>"${profile}"
        fi
    done
    chown dhika:dhika /home/dhika/.profile /home/dhika/.bashrc 2>/dev/null || true
fi

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
for cmd in node npm opencode git gh php composer; do
    runuser -u zettly-agent -- ${cmd} --version >/dev/null
done

# Codex must be gone: no binary on PATH and no package left behind.
if command -v codex >/dev/null 2>&1; then
    echo 'codex is still installed; refusing to mark the release successful' >&2
    exit 1
fi

echo "${release_sha}" >/opt/zettly-agent/.release-sha256
systemctl daemon-reload
if [[ "$(metadata agent-worker-enable)" == true ]]; then
    systemctl enable zettly-agent.service
fi
# The unit is enabled, so systemd starts it at boot before this script runs.
# Restart it so the process always executes the release that was just installed.
if systemctl is-enabled --quiet zettly-agent.service || systemctl is-active --quiet zettly-agent.service; then
    systemctl restart zettly-agent.service
fi
