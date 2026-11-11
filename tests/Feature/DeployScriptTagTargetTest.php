<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Guard test ensuring Zettly provides an official scripts/deploy.sh script
 * compatible with bw-server-clean deploy_tags.sh (jenis=laravel-script).
 */
class DeployScriptTagTargetTest extends TestCase
{
    private function script(): string
    {
        $path = base_path('scripts/deploy.sh');
        $this->assertFileExists($path, 'scripts/deploy.sh must exist in repository root');

        return (string) file_get_contents($path);
    }

    private function code(): string
    {
        $lines = [];
        foreach (explode("\n", $this->script()) as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }
            $lines[] = $trimmed;
        }

        return implode("\n", $lines);
    }

    public function test_accepts_tag_and_branch_options(): void
    {
        $code = $this->code();
        $this->assertMatchesRegularExpression('/--tag=\*/', $code, 'deploy.sh must accept --tag=<tag>');
        $this->assertMatchesRegularExpression('/--branch=\*/', $code, 'deploy.sh must accept --branch=<branch>');
        $this->assertMatchesRegularExpression('/--dry-run/', $code, 'deploy.sh must accept --dry-run');
    }

    public function test_resolves_target_from_git_tag(): void
    {
        $code = $this->code();
        $this->assertStringContainsString('refs/tags/$DEPLOY_TAG', $code, 'deploy.sh must resolve commit from git tag');
    }

    public function test_runs_migrations_and_clears_route_cache(): void
    {
        $code = $this->code();
        $this->assertStringContainsString('migrate --force', $code, 'deploy.sh must run migrations');
        $this->assertStringContainsString('route:clear', $code, 'deploy.sh must explicitly clear routes to prevent stale route caches');
    }

    public function test_runs_atomic_frontend_asset_build(): void
    {
        $code = $this->code();
        $this->assertTrue(
            str_contains($code, 'scripts/build-assets.sh') || str_contains($code, 'build:atomic'),
            'deploy.sh must build frontend assets using atomic asset swap'
        );
    }

    public function test_writes_deployment_marker(): void
    {
        $code = $this->code();
        $this->assertStringContainsString(
            '/var/lib/deploy-tags/deployed',
            $code,
            'deploy.sh must write version marker for auto-deploy tracking'
        );
    }

    /**
     * Queue workers keep the job classes they booted with in memory.
     *
     * 11 November 2026: a fix to DispatchReportGeneration was deployed and the
     * site reported success, but every queued run still failed with the old
     * BindingResolutionException because the workers had been running for 50
     * minutes. `queue:restart` makes each worker finish its current job and
     * exit, so supervisor starts it on the new code.
     */
    public function test_restarts_queue_workers_after_deploy(): void
    {
        $code = $this->code();
        $this->assertStringContainsString(
            'queue:restart',
            $code,
            'deploy.sh must run queue:restart, otherwise workers keep executing the previous release'
        );
    }

    /**
     * The script must run the version it just installed, not the one it started as.
     *
     * WHY THIS TEST EXISTS
     * --------------------
     * `deploy.sh` copies itself to /tmp before `git reset --hard`, because bash
     * reads a script incrementally and resetting the file mid-run is unsafe.
     * The copy is therefore the PREVIOUS release's script. Every step added to
     * this file used to take effect one release late: v0.12.32 added
     * `queue:restart`, the cycle installed v0.12.32, and the workers were never
     * restarted because the running copy was v0.12.31's.
     *
     * The fix re-executes the script that the target commit ships, after the
     * reset. This test pins that the re-exec happens after `git reset`.
     */
    public function test_reexecutes_the_script_shipped_by_the_target_commit(): void
    {
        $script = $this->script();
        $resetAt = strpos($script, 'git reset --hard');
        $stage2At = strpos($script, 'ZETTLY_DEPLOY_STAGE2');

        $this->assertNotFalse($resetAt, 'deploy.sh must reset the working tree');
        $this->assertNotFalse($stage2At, 'deploy.sh must re-exec the script shipped by the target commit');
        $this->assertGreaterThan(
            $resetAt,
            $stage2At,
            'The stage-2 re-exec must come AFTER git reset --hard, otherwise it runs the old script again'
        );
    }
}
