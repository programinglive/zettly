<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Guards the secret-scanning configuration added after the 2026-11-18 audit.
 *
 * A real Gemini API key was committed to the public repository in .env.testing
 * (commit 982f1aa) and could not be removed by a forward-only cleanup. The key
 * is revoked and all GCP API keys were deleted; .gitleaksignore records that
 * acknowledged finding so CI fails only on NEW secrets. These tests prevent
 * both the workflow and the acknowledgement from being silently removed.
 */
class SecretScanConfigTest extends TestCase
{
    public function test_secret_scan_workflow_exists_and_scans_full_history(): void
    {
        $path = base_path('.github/workflows/secret-scan.yml');

        $this->assertFileExists($path, 'The Secret Scan workflow must be committed.');

        $contents = (string) file_get_contents($path);

        $this->assertStringContainsString('gitleaks', $contents);
        $this->assertStringContainsString('fetch-depth: 0', $contents, 'Full history must be fetched to detect past leaks.');
        $this->assertStringContainsString('.gitleaksignore', $contents, 'The workflow must honour the acknowledgement file.');
    }

    public function test_known_leaked_key_is_acknowledged_in_gitleaks_ignore(): void
    {
        $path = base_path('.gitleaksignore');

        $this->assertFileExists($path);

        $contents = (string) file_get_contents($path);

        $this->assertStringContainsString(
            '982f1aae18f74bcc75269c93fe11fbcce251eac8:.env.testing:gcp-api-key:7',
            $contents,
            'The revoked historical key must stay acknowledged until history is rewritten.'
        );
    }
}
