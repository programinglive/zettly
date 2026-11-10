# Zettly Coding Worker

This worker polls Zettly over outbound HTTPS. It accepts only repository keys in the local allowlist, creates one Git worktree per job, runs Codex CLI in workspace-write mode, runs trusted repository test commands, and opens a draft pull request. It never merges, deploys, or connects to a production server. A 409 lease response stops the running subprocess.

## Local checks

Run `python3 -m unittest discover -s agent_worker -p 'test_*.py' -v` and `php artisan test tests/Feature/Api/CodingAgentWorkerTest.php --compact`. The Python tests use fake clients and processes; they do not call Codex or mutate a repository.

## Runtime requirements

- Python 3.11+, Git, GitHub CLI, Codex CLI, and each allowlisted repository's build tools.
- A dedicated Zettly Sanctum token with the exact `coding-agent:worker` ability. The worker's Zettly identity must be the configured verified owner.
- A dedicated GitHub credential with only the repositories and pull-request permissions required for the pilot, supplied as `GH_TOKEN`.
- A dedicated OpenAI API key for Codex CLI authentication under the `zettly-agent` service account. `start.sh` reads the key from Secret Manager and passes it to `codex login --with-api-key` over stdin. Do not copy a desktop OAuth file or personal GitHub token to the VM.
- Outbound HTTPS to Zettly, GitHub, package registries, and OpenAI. No inbound application port is needed.

The release bootstrap writes a protected environment file with `GOOGLE_CLOUD_PROJECT=phrasal-ground-377312`, `ZETTLY_URL=https://zettly.programinglive.com`, `AGENT_WORK_ROOT=/srv/zettly-agent`, `AGENT_REPOSITORIES_FILE=/etc/zettly-agent/repositories.json`, and `AGENT_TARGET_ENVIRONMENT=staging`. It installs the reviewed `repositories.example.json` allowlist. `start.sh` fetches the worker, GitHub, and OpenAI credentials at service start from three dedicated Google Secret Manager secrets; no token value is stored in the unit or environment file. Those secrets currently have no versions.

Run `python3 -m agent_worker` from the repository root. Startup checks GitHub and Codex authentication before claiming any job. Job instructions never become shell commands. Test and Codex subprocesses are launched without the Zettly token, GitHub token, or OpenAI API key in their environment; GitHub commands receive only `GH_TOKEN`. The pilot VM and service account should still be treated as sensitive because executable repository code can access its own user files and network. Use narrowly scoped credentials and a dedicated VM.

The private pilot VM is provisioned but stopped. The worker code is not installed there. The worker workflow tests pull requests, packages a release artifact from `agent-worker-v*` tags, authenticates to GCP with a tag-scoped Workload Identity provider, and deploys the checksum-verified artifact through startup metadata. Deployment requires the tagged commit to be on `main` and the VM to be stopped. The worker service stays disabled unless the repository variable `ZETTLY_AGENT_ENABLE` is set to `true` before a release. After both PRs are merged, promote a worker release through CI/CD, populate the three dedicated Secret Manager secrets, then test a job end to end before enabling `CODING_AGENT_ENABLED` in Zettly.
