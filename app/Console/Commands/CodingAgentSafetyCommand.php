<?php

namespace App\Console\Commands;

use App\Services\AiOrganization\AiCtoOrchestratorService;
use App\Services\ReleaseSafety\PrReversibilityAssessor;
use App\Support\CodingAgentRoleRegistry;
use Illuminate\Console\Command;

class CodingAgentSafetyCommand extends Command
{
    protected $signature = 'coding-agent:safety
        {action=roles : Action to run: roles, assess, standards, or recover-stalled}
        {--repo=zettly : Repository slug for assessment}
        {--commit= : Evaluated commit SHA}
        {--previous-release=v1.6.0 : Known-good rollback release tag}
        {--files=* : Changed file paths}
        {--diff= : Diff text to evaluate}
        {--tests-passed : Mark automated tests as passed}
        {--review-passed : Mark independent review as passed}
        {--backup-verified : Mark pre-deployment DB backup as verified}';

    protected $description = 'Inspect AI Engineering Organization 12-role registry, engineering standards, stalled workflow recovery, or run an 8-dimension PR Reversibility Assessment.';

    public function handle(PrReversibilityAssessor $assessor, AiCtoOrchestratorService $orchestrator): int
    {
        $action = (string) $this->argument('action');

        if ($action === 'roles') {
            $this->line((string) json_encode([
                'mvt_pipeline' => CodingAgentRoleRegistry::mvtPipelineOrder(),
                'routing_profiles' => [
                    'FAST' => CodingAgentRoleRegistry::rolesForRoutingProfile('FAST'),
                    'STANDARD' => CodingAgentRoleRegistry::rolesForRoutingProfile('STANDARD'),
                    'FULL' => CodingAgentRoleRegistry::rolesForRoutingProfile('FULL'),
                ],
                'roles' => CodingAgentRoleRegistry::all(),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        if ($action === 'standards') {
            $dir = base_path('engineering/standards');
            $files = is_dir($dir) ? (glob($dir.'/*.yaml') ?: []) : [];
            $this->line((string) json_encode([
                'standards_directory' => 'engineering/standards',
                'files' => array_map('basename', $files),
                'count' => count($files),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return count($files) >= 8 ? self::SUCCESS : self::FAILURE;
        }

        if ($action === 'recover-stalled') {
            $ownerId = (int) config('coding_agent.owner_user_id', 1);
            $result = $orchestrator->detectAndRecoverStalledWorkflows($ownerId);
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

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

        $this->error("Unknown action '{$action}'. Use 'roles', 'standards', 'recover-stalled', or 'assess'.");

        return self::FAILURE;
    }
}
