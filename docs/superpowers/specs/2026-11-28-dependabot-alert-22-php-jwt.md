# Dependabot alert #22 — firebase/php-jwt 6.11.1 (2026-11-28)

## Intent

Close GitHub Dependabot alert #22 on `programinglive/zettly`: `firebase/php-jwt` 6.11.1 is vulnerable to CVE-2025-45769 / GHSA-2x45-7fc3-mxwq (weak encryption). First patched version is 7.0.0.

## Findings

- Alert #22 is open, low severity (CVSS v4 2.7, EPSS 0.002), GitHub reachability verdict `disabled`.
- No `Firebase\JWT` usage exists in application source; the package is transitive.
- `composer why firebase/php-jwt` showed two parents: `google/apiclient` v2.18.4 and `google/auth` v1.49.0, both requiring `^6.0`.
- `composer.json` only constrains `google/apiclient: ^2.15`, so a newer parent is allowed.

## Approach

Upgrade the parent chain instead of forcing the child:

- `google/apiclient` v2.18.4 → v2.20.1 (accepts `firebase/php-jwt ^6.0||^7.0`)
- `google/auth` v1.49.0 → v1.55.3 (accepts `firebase/php-jwt ^6.0||^7.0`)
- `firebase/php-jwt` v6.11.1 → v7.2.2

Command: `composer update google/apiclient google/auth firebase/php-jwt --with-all-dependencies --no-interaction`.

## Verification

- Guard test `tests/Unit/DependabotAlert22Test` fails on 6.11.1 and passes on 7.2.2.
- `composer validate --strict` passes.
- `php artisan test`: 817 passed, 1 skipped (4256 assertions).
- `npm test`: 176 JS + 35 CLI tests pass.
- `npm run build`: production Vite build with atomic swap succeeds.
- GitHub alert state must be re-checked after the lockfile reaches the default branch.

## Known remaining advisories

`composer audit` still reports 16 advisories on `symfony/http-kernel`, `symfony/mailer`, `symfony/routing` and `web-token/jwt-library`. These predate this change (the previously locked versions were also affected) and are tracked separately, not mixed into this security fix.

## Rollback

Revert `composer.lock` and remove the guard test; no application source, schema, secrets or deployment configuration changes are part of this fix.
