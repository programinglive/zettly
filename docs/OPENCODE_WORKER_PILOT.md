# OpenCode Worker Pilot Verification

## Worker Configuration
- The worker now runs OpenCode (opencode run --standalone --auto --model kenari/<model>) against https://kenari.id/v1 using free models only
- The Kenari key is scoped to the OpenCode child process only
- Codex is removed from the VM
- Manual coding uses OpenCode plus the Antigravity CLI (agy)

## Key Security Measures
- A dedicated Zettly Sanctum token with the exact `coding-agent:worker` ability
- A dedicated GitHub credential with only the repositories and pull-request permissions required for the pilot
- A Kenari.ID API key supplied as `KENARI_API_KEY`
- The executor's strips the API key from every child process except the OpenCode invocation
- No Codex login, OAuth file, or personal token is used on the VM

## Runtime Requirements
- Python 3.11+, Git, GitHub CLI, OpenCode CLI, and each allowlisted repository's build tools
- Outbound HTTPS to Zettly, GitHub, package registries, and https://kenari.id/v1
- No inbound application port is needed

## Configuration
The bootstrap writes `/home/zettly-agent/.config/opencode/opencode.json` which declares the `kenari` provider (@opencode/ai/providers/openai-compatible, baseURL=https://kenari.id/v1, credential from `KENARI_API_KEY`) and the model IDs the Zettly UI can select. Only free Kenari models are listed, and the executor refuses any job model outside that free allowlist.

## Security Features
- The bootstrap installs the Antigravity CLI (`agy`) for the `dhika` user and removes every Codex artifact: the global npm package, `/usr/local/bin/codex`, and the per-user `~/.codex` directories
- The bootstrap fails the release if `codex` is still on `PATH`
- Test and OpenCode subprocesses are launched without the Zettly token or GitHub token in their environment
- Only the OpenCode subprocess receives `KENARI_API_KEY`, and GitHub commands receive only `GH_TOKEN`