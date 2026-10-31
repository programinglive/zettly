# Zettly CLI Implementation Plan

1. **Done:** standalone Node CLI package with host config, bearer client, human/JSON output, confirmation prompts, DPAPI token vault and hidden token prompt.
2. **Done:** `/api/v1` routes for todos/notes, tags, focus, habits, organizations, drawings, attachments, push, profile and token management. Protected routes enforce the `zettly:cli` ability; organization/admin routes preserve membership and role checks. Public account lifecycle routes are rate-limited.
3. **Done:** graph JSON export and super-admin-only rebuild; system status, admin monitor and test-email endpoints.
4. **Done:** CLI operations and examples documented in `cli/README.md`; remaining browser-only boundaries are push permission grants and visual canvas editing.
5. **Verified before auth additions:** Node/PHP syntax, help output, `git diff --check`, and Laravel route registration showed 71 `/api/v1` routes; standard routes had Sanctum plus `abilities:zettly:cli`, admin routes had `EnsureSuperAdmin`. No authenticated endpoint requests were made.
6. **Done:** Profile password change is available through CLI and uses current-password validation plus Laravel's default password policy.
7. **Implemented; runtime validation pending:** Account registration, password recovery, verification resend and signed email verification are available in the CLI. Public auth routes are throttled; verification requires the signed web URL, matching configured host and the user's CLI token. PHP/Node syntax checks pass; route boot and authenticated email flows are not yet exercised.
8. PR #7 is ready for review; these auth changes remain local until committed and pushed. No merge, release or deploy.
