# Zettly CLI Implementation Plan

1. **Done:** standalone Node CLI package with host config, bearer client, human/JSON output, confirmation prompts, DPAPI token vault and hidden token prompt.
2. **Done:** `/api/v1` routes for todos/notes, tags, focus, habits, organizations, drawings, attachments, push and profile. Sanctum tokens can be exchanged for `zettly:cli` ability tokens; every v1 route enforces that ability. Organization/admin routes preserve membership and role checks.
3. **Done:** graph JSON export and super-admin-only rebuild; system status, admin monitor and test-email endpoints.
4. **Done:** CLI operations and examples documented in `cli/README.md`; browser-only boundaries identified for registration/recovery, push permission grants and visual canvas editing.
5. **Done:** Node/PHP syntax, help output, `git diff --check`, and Laravel route registration verified. Used the existing main checkout Composer autoload and cache manifests without installing dependencies; all 71 pre-password `/api/v1` routes register, standard routes show Sanctum plus `abilities:zettly:cli`, and admin routes also show `EnsureSuperAdmin`. Authenticated endpoint behavior and the added password route are not exercised in Laravel here.
6. **Done:** Profile password change is available through the CLI; the API validates the current password and Laravel password policy, and interactive CLI prompts hide input. Non-interactive use requires a private JSON file.
7. Branch `feat/zettly-cli` is pushed and PR #7 is ready for review; no merge, release or deploy.
