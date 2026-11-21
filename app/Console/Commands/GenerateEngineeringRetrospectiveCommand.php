<?php

namespace App\Console\Commands;

use App\Services\AiOrganization\AgentPerformanceScorecardService;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use Illuminate\Console\Command;

class GenerateEngineeringRetrospectiveCommand extends Command
{
    protected $signature = 'engineering:retrospective
        {kind=daily : Period kind: daily, weekly, monthly, or scorecard}
        {--period= : Explicit period key (YYYY-MM-DD, YYYY-Www, or YYYY-MM)}
        {--user= : Target owner user ID}
        {--regenerate : Force regeneration while preserving previous version history}';

    protected $description = 'Generate idempotent, versioned Daily, Weekly, or Monthly Engineering Retrospectives (Asia/Jakarta) or evaluate Agent Performance Scorecards.';

    public function handle(
        EngineeringIntelligenceService $intelligence,
        AgentPerformanceScorecardService $scorecard
    ): int {
        $kind = strtolower((string) $this->argument('kind'));
        $userId = (int) ($this->option('user') ?: config('coding_agent.owner_user_id', 1));
        $period = $this->option('period') ? (string) $this->option('period') : null;
        $regenerate = (bool) $this->option('regenerate');

        if ($kind === 'scorecard') {
            $result = $scorecard->evaluate($userId);
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $retro = match ($kind) {
            'daily' => $intelligence->generateDailyRetrospective($userId, $period, $regenerate),
            'weekly' => $intelligence->generateWeeklyRetrospective($userId, $period, $regenerate),
            'monthly' => $intelligence->generateMonthlyRetrospective($userId, $period, $regenerate),
            default => null,
        };

        if (! $retro) {
            $this->error("Unsupported retrospective kind '{$kind}'. Use daily, weekly, monthly, or scorecard.");

            return self::FAILURE;
        }

        $this->line((string) json_encode([
            'id' => $retro->id,
            'period_kind' => $retro->period_kind,
            'period_key' => $retro->period_key,
            'title' => $retro->title,
            'version' => $retro->version,
            'status' => $retro->status,
            'metrics' => $retro->metrics,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }
}
