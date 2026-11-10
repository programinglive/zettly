# Coding Agent Control Plane

This pilot lets the configured, verified owner create and review coding jobs from Zettly on a phone. Each job belongs to an existing personal Todo. A separate VM worker polls the API and reports progress. Zettly records approval for an exact repository, target environment, and Git commit SHA; it does not start a release pipeline.

## Configuration

The feature is off by default. Set `CODING_AGENT_ENABLED=true`, `CODING_AGENT_OWNER_USER_ID` to the existing Zettly user's numeric ID, and `CODING_AGENT_OWNER_EMAIL=mahatma.mahardhika@programinglive.com` only after the worker pilot is verified. Set `CODING_AGENT_REPOSITORIES` to a JSON object mapping stable keys to approved repository metadata (or shorthand remote strings), for example:

```json
{
  "zettly": {
    "name": "programinglive/zettly",
    "remote": "programinglive/zettly",
    "base": "main",
    "stack": "Laravel",
    "checks": "php artisan test && npm run test:js"
  }
}
```

Verify the resulting Laravel config before enabling (`App\Support\CodingAgentRepositoryRegistry`). The browser accepts only keys in this allowlist, and `/agent/setup` displays the full registered Project & Repository Registry.

The configured owner can open `/agent/setup` while jobs are disabled and issue a dedicated Sanctum token with the **exact** `coding-agent:worker` ability. A normal `*` token is rejected by the worker middleware. A newly issued token revokes the previous worker token and appears only once; store it in the VM secret manager, never in a repository or chat. The owner must keep a verified email. Only the configured owner ID and email can open `/agent/jobs` or `/agent/setup`; another super administrator is denied.

## Browser workflow (Consolidated Engineering Hub)

1. Open `/agent/jobs` in the Zettly PWA (or click **Dispatch to Coding Agent** directly on any personal Todo page `/todos/{id}`, which links to `/agent/jobs?todo_id={id}`).
2. When a Todo is selected, Zettly automatically matches its `proyek:*` tag to the registered repository and allows one-click loading of the Todo's description, checklist items (Definition of Done), and repository verification command (`checks`) into the agent specification. The browser keeps a `client_request_id` across retries so a dropped connection cannot create the same job twice.
3. `/agent/jobs` also surfaces the **14-Day Engineering Recap** (`Today`, `This Week`, `This Month`, `All Completed` in `Asia/Jakarta` timezone, 14-day bar strip, and per-repository breakdown), **Active AI Coding Sessions**, and **Engineering Pipeline stage filters** (`All`, `Queued`, `Running`, `Needs Input`, `Review / PR Ready`, `Completed`, `Failed / Cancelled`).
2. The job page shows persisted status, worker heartbeat, recent activity, and controls to pause, resume, cancel, or send a follow-up instruction. Offline actions are disabled; reloading reads the saved state.
3. The worker submits a branch, commit SHA, test summary, and target environment. Approval is available only for a reviewed artifact with passing tests. Approval stores the exact SHA and marks the job `release_pending`.
4. A future repository-specific CI adapter must independently verify that the recorded approval still matches the repository, environment, and SHA before any release. No route in this pilot deploys code or edits a production server.

## Worker API

All routes below require `Authorization: Bearer <dedicated-worker-token>` and `CODING_AGENT_ENABLED=true`. The worker claims jobs through outbound HTTPS polling; Zettly does not connect to the VM.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/coding-agent/claim` | Claim one queued or expired running job; returns ID, repository key, instruction, lease token, and lease expiry. Returns HTTP 204 when empty. |
| POST | `/api/v1/coding-agent/jobs/{id}/heartbeat` | Renew a valid lease with `lease_token`. |
| POST | `/api/v1/coding-agent/jobs/{id}/instructions` | Read at most 50 follow-up instructions after an event ID. Send `lease_token` and optional `after_id` in the JSON body. |
| POST | `/api/v1/coding-agent/jobs/{id}/events` | Append `event_key`, `kind`, `detail`, `occurred_at`, and `lease_token`. Repeating an event key is idempotent. Detail is redacted and bounded before storage. |
| POST | `/api/v1/coding-agent/jobs/{id}/result` | Submit `lease_token`, `branch`, `commit_sha`, `pr_url` (optional), `test_summary`, `tests_passed`, and `target_environment`. A passing result enters review; a failing result enters failed. |
| POST | `/api/v1/coding-agent/jobs/{id}/fail` | Mark a leased job failed with `lease_token` and a bounded `summary` when no commit exists. |

Lease tokens expire after 120 seconds and are stored only as hashes. The worker must stop work if a heartbeat or instruction request returns HTTP 409, such as when the owner pauses or cancels the job or another worker reclaims an expired lease. The worker cannot approve a release. A browser session and a generic CLI token cannot use these routes.

The worker should perform all code changes on a branch, run local tests, use Conventional Commits, and submit changes through the repository's CI/CD workflow. Read-only production diagnostics and the existing approved operational commands remain separate from code changes.

## Current rollout boundary

The control plane is in draft PR #17. The worker implementation and its checks are in a separate dependent branch. The GCP pilot VM `zettly-coding-agent-1` exists in `phrasal-ground-377312`, zone `asia-southeast2-a`, with an e2-standard-2 machine, 50 GiB balanced boot disk, dedicated service account, private `10.250.10.2` address, and no external IP. It is currently **stopped**. Its dedicated VPC allows SSH only from IAP and uses Cloud NAT for outbound access. The project has a verified IDR 2,000,000 monthly budget with 50%, 90%, and 100% alerts; alerts are not a hard spending cap. Stopped VM storage and networking resources can still incur charges. See [Cloud NAT pricing](https://cloud.google.com/nat/pricing) and [IAP TCP forwarding](https://docs.cloud.google.com/iap/docs/using-tcp-forwarding).

`technology@edmeeclinic.com` has verified IAP tunnel and OS Login administrator IAM bindings for infrastructure maintenance. A read-only SSH session from HELLOWORLD succeeded on 2026-11-10 using `--billing-project=phrasal-ground-377312` and a pinned SSH host-key fingerprint; `hostname` returned `zettly-coding-agent-1`. Python 3, Git, and the Google OS Config agent are present; GitHub CLI and Codex CLI are not installed. The VM was stopped again after this check. The requested `mahatma.mahardhika@programinglive.com` address was rejected as a nonexistent GCP IAM user; Zettly application access remains restricted to that exact address. The VM has no worker installed or service credentials. Three empty Google Secret Manager resources, `zettly-agent-worker-token`, `zettly-agent-github-token`, and `zettly-agent-openai-api-key`, are scoped to the dedicated VM service account. The tag-scoped GitHub Workload Identity provider and least-privilege release deployer are configured; the worker deployment pipeline is present in draft PR #18 but has not run. Secret versions, a successful worker deployment, a disposable PostgreSQL competing-claim test, end-to-end phone smoke test, and repository-specific CI release adapter remain open. Do not enable `CODING_AGENT_ENABLED` until the worker can process a test job and the exact-SHA review flow has been verified.
