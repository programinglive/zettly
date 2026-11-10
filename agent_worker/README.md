# Zettly Coding Worker

This worker polls Zettly over outbound HTTPS. It accepts only repository keys in the local allowlist, creates one Git worktree per job, runs Codex CLI in workspace-write mode, runs trusted repository test commands, and opens a draft pull request. It never merges, deploys, or connects to a production server. A 409 lease response stops the running subprocess.

## Local checks

Run `python3 -m unittest discover -s agent_worker -p 'test_*.py' -v` and `php artisan test tests/Feature/Api/CodingAgentWorkerTest.php --compact`. The Python tests use fake clients and processes; they do not call Codex or mutate a repository.

## Runtime requirements

- Python 3.11+, Git, GitHub CLI, Codex CLI, and each allowlisted repository's build tools.
- A dedicated Zettly Sanctum token with the exact `coding-agent:worker` ability. The worker's Zettly identity must be the configured verified owner.
- A dedicated GitHub credential with only the repositories and pull-request permissions required for the pilot, supplied as `GH_TOKEN`.
- Codex CLI authentication under the `zettly-agent` service account. Follow [official Codex CLI authentication guidance](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-login); do not copy a desktop OAuth file or personal GitHub token to the VM.
- Outbound HTTPS to Zettly, GitHub, package registries, and OpenAI. No inbound application port is needed.

Set `GOOGLE_CLOUD_PROJECT=phrasal-ground-377312`, `ZETTLY_URL=https://zettly.programinglive.com`, `AGENT_WORK_ROOT=/srv/zettly-agent`, `AGENT_REPOSITORIES_FILE=/opt/zettly-agent/agent_worker/repositories.json`, and `AGENT_TARGET_ENVIRONMENT=staging` in a protected environment file delivered by the deployment pipeline. Copy and review `repositories.example.json` as the repository allowlist. Keep the environment file out of Git and restrict it to the service manager. `start.sh` fetches the worker and GitHub tokens at service start from two dedicated Google Secret Manager secrets; no token value is stored in the unit or environment file. Those secrets currently have no versions. The systemd unit is an installation artifact, not a remote editing instruction.

Run `python3 -m agent_worker` from the repository root. Startup checks GitHub and Codex authentication before claiming any job. Job instructions never become shell commands. Test and Codex subprocesses are launched without the Zettly token, GitHub token, or OpenAI API key in their environment; GitHub commands receive only `GH_TOKEN`. The pilot VM and service account should still be treated as sensitive because executable repository code can access its own user files and network. Use narrowly scoped credentials and a dedicated VM.

The private pilot VM is provisioned but stopped. The worker code is not installed there, and the repository currently has only CI checks for the worker, not an automatic deployment job. After the control-plane PR is merged, package this worker through CI/CD, deliver dedicated service credentials through the deployment pipeline, then test a job end to end before enabling `CODING_AGENT_ENABLED` in Zettly.
