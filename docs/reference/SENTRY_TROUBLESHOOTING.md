# Sentry Troubleshooting Guide

Use this guide to diagnose and resolve common issues when working with the Sentry integration.

---

## ⚠️ Authentication & Authorization

### 403 Forbidden or 401 Unauthorized

- Confirm the API token has the required scopes: `project:read`, `event:read`, `issue:read`, `issue:write`.
- Ensure the token belongs to a user with access to the target organization and project.
- Verify that the token value is correctly set in `.env` as `SENTRY_TOKEN` (no extra whitespace).

### Invalid Token Errors

- Run `php artisan sentry:test-token <token>` to validate the token.
- Regenerate the token from **User Settings > API Tokens** if validation fails.

---

## 📁 Project & Organization Configuration

### No Issues Returned

- Double-check `SENTRY_ORG` and `SENTRY_PROJECT` match the slugs shown in Sentry project settings.
- Verify the project actually has unresolved issues matching the query.
- Adjust `--limit` or `--query` options when running `php artisan sentry:pull`.

### Project Not Found

- Confirm the DSN belongs to the same organization and project configured in the environment variables.
- Re-run `php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider"` after changing DSN settings.

---

## 🛠 Command Execution Issues

### `php artisan sentry:pull` Fails

- Make sure `SENTRY_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set and cached configuration is cleared (`php artisan config:clear`).
- Check network access to `https://sentry.io/api/0/`.
- Inspect the Sentry API response by adding `-vvv` flag to the Artisan command for verbose output.

### Command Not Found

- Confirm the command class exists under `app/Console/Commands`.
- Ensure the command is registered in `app/Console/Kernel.php` or auto-loaded via `$this->load(__DIR__.'/Commands');`.
- Run `composer dump-autoload` to refresh the autoloader.

---

## 📄 SENTRY_TODO.md Problems

### File Not Generated

- Verify write permissions in the project root.
- Ensure the command is being executed from the project folder.
- Check Sentry API response logs for errors.

### Stale Data

- Re-run `php artisan sentry:pull` to refresh.
- Delete `SENTRY_TODO.md` and regenerate if manual edits caused formatting issues.

---

## 📈 Performance Monitoring Issues

### Traces Not Appearing

- Confirm `SENTRY_TRACES_SAMPLE_RATE` is set appropriately in the environment.
- Ensure the middleware `\Sentry\Laravel\Integration\HttpCaptureUnhandledRequests::class` is registered in both `web` and `api` middleware groups.

---

## 🔄 Recurrent Errors

- Verify application errors are logged through Laravel’s exception handler (default behavior).
- Review Sentry project alert rules to ensure notifications are configured.

If issues persist, consult the [Sentry Laravel documentation](https://docs.sentry.io/platforms/php/guides/laravel/) or contact Sentry support with relevant log excerpts.
