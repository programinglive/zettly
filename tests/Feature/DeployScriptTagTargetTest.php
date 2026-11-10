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
}
