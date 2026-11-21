<?php

namespace App\Console\Commands;

use App\Services\ReleaseSafety\PrReversibilityAssessor;
use App\Support\CodingAgentRoleRegistry;
use Illuminate\Console\Command;

class CodingAgentSafetyCommand extends Command
{
    protected $signature = 'coding-agent:safety
        {action=roles : Action to run: roles or assess}
        {--repo=zettly : Repository slug for assessment}
        {--commit= : Evaluated commit SHA}
        {--previous-release=v1.5.5 : Known-good rollback release tag}
        {--files=* : Changed file paths}
        {--diff= : Diff text to evaluate}
        {--tests-passed : Mark automated tests as passed}
        {--review-passed : Mark independent review as passed}
        {--backup-verified : Mark pre-deployment DB backup as verified}';

    protected $description = 'Inspect AI Engineering Organization 12-role registry or run an 8-dimension PR Reversibility Assessment.';

    public function handle(PrReversibilityAssessor $assessor): int
    {
        $action = (string) $this->argument('action');

        if ($action === 'roles') {
            $this->line((string) json_encode([
                'mvt_pipeline' => CodingAgentRoleRegistry::mvtPipelineOrder(),
                'roles' => CodingAgentRoleRegistry::all(),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        if ($action === 'assess') {
            $files = (array) $this->option('files');
            $diff = (string) ($this->option('diff') ?? '');

            $result = $assessor->assess([
                'repository' => (string) $this->option('repo'),
                'commit_sha' => $this->option('commit') ? (string) $this->option('commit') : null,
                'previous_release' => (string) $this->option('previous-release'),
                'changed_files' => $files !== [] ? $files : null,
                'diff_text' => $diff !== '' ? $diff : null,
                'tests_passed' => (bool) $this->option('tests-passed'),
                'independent_review_passed' => (bool) $this->option('review-passed'),
                'backup_verified' => (bool) $this->option('backup-verified'),
            ]);

            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->error("Unknown action '{$action}'. Use 'roles' or 'assess'.");

        return self::FAILURE;
    }
}
