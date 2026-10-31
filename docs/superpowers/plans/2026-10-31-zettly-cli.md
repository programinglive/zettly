# Zettly CLI Implementation Plan

1. **Done:** standalone Node CLI package with host config, bearer client, human/JSON output, confirmation prompts, DPAPI token vault and hidden token prompt.
2. **Done:** `/api/v1` routes for dashboard, todos/notes, tags, focus, habits, organizations, drawings, attachments, push, profile and token management. Protected routes enforce the `zettly:cli` ability; organization/admin routes preserve membership and role checks. Public account lifecycle routes are rate-limited.
3. **Done:** graph JSON export and super-admin-only rebuild; system status, admin monitor and test-email endpoints.
4. **Done:** CLI operations and examples documented in `cli/README.md`; remaining browser-only boundaries are push permission grants and visual canvas editing.
5. **Verified:** Node/PHP syntax, help output and `git diff --check` pass. Laravel route boot using the main checkout's existing Composer dependencies registers 78 `/api/v1` routes; all 74 protected routes include `abilities:zettly:cli`, all 4 public auth routes have throttling, and the signed verification route has `auth:sanctum`, `signed` and throttling. The CLI auth controller autoloads. No authenticated endpoint requests were made.
6. **Done:** Profile password change is available through CLI and uses current-password validation plus Laravel's default password policy.
7. **Done:** Account registration, email/password login, password recovery, verification resend and signed email verification are available in the CLI. Public auth routes are throttled; verification requires the signed web URL, matching configured host and the user's CLI token. Host validation requires HTTPS except for loopback development. Auth API requests remain unexercised.
8. PR #7 is ready for review and includes the login/host-validation changes; no merge, release or deploy.
