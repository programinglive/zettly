# Coding Agent Control Plane

This pilot lets the configured, verified owner create and review coding jobs from Zettly on a phone. Each job belongs to an existing personal Todo. A separate VM worker polls the API and reports progress. Zettly records approval for an exact repository, target environment, and Git commit SHA; it does not start a release pipeline.

## Configuration

The feature is off by default. Set `CODING_AGENT_ENABLED=true`, `CODING_AGENT_OWNER_USER_ID` to the existing Zettly user's numeric ID, and `CODING_AGENT_OWNER_EMAIL=mahatma.mahardhika@programinglive.com` only after the worker pilot is verified. Set `CODING_AGENT_REPOSITORIES` to a JSON object mapping stable keys to approved repository paths, for example `'{"zettly":"programinglive/zettly"}'` as a dotenv value. Verify the resulting Laravel config before enabling. The browser accepts only keys in this allowlist. Do not place Git credentials or shell commands in the mapping.

The configured owner can open `/agent/setup` while jobs are disabled and issue a dedicated Sanctum token with the **exact** `coding-agent:worker` ability. A normal `*` token is rejected by the worker middleware. A newly issued token revokes the previous worker token and appears only once; store it in the VM secret manager, never in a repository or chat. The owner must keep a verified email. Only the configured owner ID and email can open `/agent/jobs` or `/agent/setup`; another super administrator is denied.

## Browser workflow

1. Open `/agent/jobs` in the Zettly PWA. Select an existing personal Todo and allowlisted repository, then describe the task. The browser keeps a `client_request_id` across retries so a dropped connection cannot create the same job twice.
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

`technology@edmeeclinic.com` has verified IAP tunnel and OS Login administrator IAM bindings for infrastructure maintenance. An actual SSH session from this Windows host has not been confirmed: the local Plink client closed or hung during the first attempt. The requested `mahatma.mahardhika@programinglive.com` address was rejected as a nonexistent GCP IAM user; Zettly application access remains restricted to that exact address. The VM has no worker installed or service credentials. Two empty Google Secret Manager resources, `zettly-agent-worker-token` and `zettly-agent-github-token`, are scoped to the dedicated VM service account. Secret versions, an official worker deployment pipeline, a disposable PostgreSQL competing-claim test, end-to-end phone smoke test, and repository-specific CI release adapter remain open. Do not enable `CODING_AGENT_ENABLED` until the worker can process a test job and the exact-SHA review flow has been verified.
