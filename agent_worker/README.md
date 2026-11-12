# Zettly Coding Worker

This worker polls Zettly over outbound HTTPS. It accepts only repository keys in the local allowlist, creates one Git worktree per job, runs the OpenCode CLI against the Kenari.ID provider, runs trusted repository test commands, and opens a draft pull request. It never merges, deploys, or connects to a production server. A 409 lease response stops the running subprocess.

## Local checks

Run `python3 -m unittest discover -s agent_worker -p 'test_*.py' -v` and `php artisan test tests/Feature/Api/CodingAgentWorkerTest.php --compact`. The Python tests use fake clients and processes; they do not call OpenCode or mutate a repository.

## Runtime requirements

- Python 3.11+, Git, GitHub CLI, OpenCode CLI, and each allowlisted repository's build tools.
- A dedicated Zettly Sanctum token with the exact `coding-agent:worker` ability. The worker's Zettly identity must be the configured verified owner.
- A dedicated GitHub credential with only the repositories and pull-request permissions required for the pilot, supplied as `GH_TOKEN`.
- A Kenari.ID API key supplied as `KENARI_API_KEY`. `start.sh` reads it from Secret Manager and exports it for the worker process; the executor strips it from every child process except the OpenCode invocation. No Codex login, OAuth file, or personal token is used on the VM.
- Outbound HTTPS to Zettly, GitHub, package registries, and `https://kenari.id/v1`. No inbound application port is needed.

The release bootstrap writes a protected environment file with `GOOGLE_CLOUD_PROJECT=phrasal-ground-377312`, `ZETTLY_URL=https://zettly.programinglive.com`, `AGENT_WORK_ROOT=/srv/zettly-agent`, `AGENT_REPOSITORIES_FILE=/etc/zettly-agent/repositories.json`, and `AGENT_TARGET_ENVIRONMENT=staging`. It installs the reviewed `repositories.example.json` allowlist. `start.sh` fetches the worker, GitHub, and Kenari credentials at service start from three dedicated Google Secret Manager secrets; no token value is stored in the unit or environment file.

The bootstrap also writes `/home/zettly-agent/.config/opencode/opencode.json`, which declares the `kenari` provider (`@opencode/ai/providers/openai-compatible`, `baseURL=https://kenari.id/v1`, credential from `KENARI_API_KEY`) and the model IDs the Zettly UI can select. Only free Kenari models are listed, and the executor refuses any job model outside that free allowlist, so a queued job can never spend on a paid model. It installs the Antigravity CLI (`agy`) for the `dhika` user and removes every Codex artifact: the global npm package, `/usr/local/bin/codex`, and the per-user `~/.codex` directories. The bootstrap fails the release if `codex` is still on `PATH`.

Run `python3 -m agent_worker` from the repository root. Startup checks GitHub and OpenCode before claiming any job. Job instructions never become shell commands. Test and OpenCode subprocesses are launched without the Zettly token or GitHub token in their environment; only the OpenCode subprocess receives `KENARI_API_KEY`, and GitHub commands receive only `GH_TOKEN`. The pilot VM and service account should still be treated as sensitive because executable repository code can access its own user files and network. Use narrowly scoped credentials and a dedicated VM.

Before each job the worker prunes finished job worktrees and their `agent/job-*` branches, keeping the newest `AGENT_KEEP_WORKTREES` (default 2) plus the active job; agent logs and pull-request notes are kept. Zettly also refuses to hand out a queued job whose model is outside the free allowlist: it marks that job failed with a clear reason and returns the next valid job.

The worker workflow tests pull requests, packages a release artifact from `agent-worker-v*` tags, authenticates to GCP with a tag-scoped Workload Identity provider, and deploys the checksum-verified artifact through startup metadata. Deployment requires the tagged commit to be on `main`. Because the startup script only runs at boot, the pipeline stops the VM for a planned release window, waits for `TERMINATED`, applies the metadata, and starts it again. The worker service stays disabled unless the repository variable `ZETTLY_AGENT_ENABLE` is set to `true` before a release.
