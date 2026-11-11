<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Every CI job must run on the bw-tools self-hosted runner.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * 10 November 2026 the workflows were moved off `ubuntu-latest` onto
 * `[self-hosted, linux, x64]`. That label set matches ANY self-hosted Linux
 * x64 runner, not the one the fleet standard names. The standard is the
 * universal runner on bw-tools (100.77.138.14), registered at group scope as
 * `bw-tools group linux` with the `bw-tools` label.
 *
 * Without the explicit label a job can silently land on a different host, and
 * a decommissioned Windows runner would still be a valid target for a job that
 * only asked for `self-hosted`. This test pins the label so a future edit
 * cannot quietly widen the target again.
 */
class CiWorkflowRunnerTest extends TestCase
{
    private const REQUIRED_LABEL = 'bw-tools';

    /**
     * @return array<string, string> workflow file name => contents
     */
    private function workflows(): array
    {
        $dir = base_path('.github/workflows');
        $this->assertDirectoryExists($dir, 'No .github/workflows directory to check.');

        $files = glob($dir.'/*.{yml,yaml}', GLOB_BRACE) ?: [];
        $this->assertNotEmpty($files, 'No workflow files found.');

        $out = [];
        foreach ($files as $file) {
            $out[basename($file)] = (string) file_get_contents($file);
        }

        return $out;
    }

    public function test_every_job_targets_the_bw_tools_runner(): void
    {
        foreach ($this->workflows() as $name => $contents) {
            preg_match_all('/^\s*runs-on:\s*(.+)$/m', $contents, $matches);

            $this->assertNotEmpty($matches[1], "{$name} declares no runs-on.");

            foreach ($matches[1] as $runsOn) {
                $this->assertStringContainsString(
                    self::REQUIRED_LABEL,
                    $runsOn,
                    "{$name} runs on {$runsOn} without the '".self::REQUIRED_LABEL."' label. ".
                    'A bare [self-hosted, linux, x64] set can land on any host, including a retired one.'
                );
            }
        }
    }

    public function test_no_workflow_targets_a_decommissioned_host(): void
    {
        foreach ($this->workflows() as $name => $contents) {
            $this->assertDoesNotMatchRegularExpression(
                '/\bmmch\b/i',
                $contents,
                "{$name} references MMCH, which must not receive new CI work."
            );
            $this->assertDoesNotMatchRegularExpression(
                '/runs-on:\s*\[?[^\n]*\bwindows\b/i',
                $contents,
                "{$name} targets a Windows runner; the fleet standard is the Linux runner on bw-tools."
            );
        }
    }
}
