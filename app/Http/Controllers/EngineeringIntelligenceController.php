<?php

namespace App\Http\Controllers;

use App\Models\EngineeringImprovement;
use App\Models\EngineeringLesson;
use App\Models\EngineeringRetrospective;
use App\Services\AiOrganization\AgentPerformanceScorecardService;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EngineeringIntelligenceController extends Controller
{
    public function index(
        Request $request,
        AgentPerformanceScorecardService $scorecardService
    ): Response {
        $userId = (int) $request->user()->id;

        $retrospectives = EngineeringRetrospective::query()
            ->where('user_id', $userId)
            ->orderByDesc('period_start')
            ->limit(30)
            ->get()
            ->map(fn (EngineeringRetrospective $r) => [
                'id' => $r->id,
                'period_kind' => $r->period_kind,
                'period_key' => $r->period_key,
                'title' => $r->title,
                'version' => $r->version,
                'status' => $r->status,
                'metrics' => $r->metrics,
                'sections' => $r->sections,
                'generated_at' => $r->generated_at?->toIso8601String(),
                'regenerated_at' => $r->regenerated_at?->toIso8601String(),
            ])->values()->all();

        $improvements = EngineeringImprovement::query()
            ->where('user_id', $userId)
            ->orderByDesc('occurrence_count')
            ->limit(50)
            ->get()
            ->map(fn (EngineeringImprovement $imp) => [
                'id' => $imp->id,
                'action_code' => $imp->action_code,
                'title' => $imp->title,
                'owner_role' => $imp->owner_role,
                'priority' => $imp->priority,
                'status' => $imp->status,
                'occurrence_count' => $imp->occurrence_count,
                'expected_outcome' => $imp->expected_outcome,
                'verification_criteria' => $imp->verification_criteria,
                'effectiveness_metrics' => $imp->effectiveness_metrics,
            ])->values()->all();

        $lessons = EngineeringLesson::query()
            ->where('user_id', $userId)
            ->orderByDesc('recorded_at')
            ->limit(30)
            ->get()
            ->map(fn (EngineeringLesson $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'category' => $l->category,
                'affected_system' => $l->affected_system,
                'confidence' => $l->confidence,
                'context' => $l->context,
                'version' => $l->version,
                'recorded_at' => $l->recorded_at?->toIso8601String(),
            ])->values()->all();

        return Inertia::render('Agent/Intelligence', [
            'retrospectives' => $retrospectives,
            'improvements' => $improvements,
            'lessons' => $lessons,
            'scorecard' => $scorecardService->evaluate($userId),
            'concurrency_limit' => (int) config('coding_agent.max_concurrent_jobs', 2),
            'budgets' => config('coding_agent.budgets', []),
        ]);
    }

    public function generate(Request $request, EngineeringIntelligenceService $intelligence): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'string', 'in:daily,weekly,monthly'],
            'period_key' => ['nullable', 'string', 'max:32'],
            'regenerate' => ['sometimes', 'boolean'],
        ]);

        $userId = (int) $request->user()->id;
        $regen = (bool) ($data['regenerate'] ?? false);
        $key = $data['period_key'] ?? null;

        match ($data['kind']) {
            'daily' => $intelligence->generateDailyRetrospective($userId, $key, $regen),
            'weekly' => $intelligence->generateWeeklyRetrospective($userId, $key, $regen),
            'monthly' => $intelligence->generateMonthlyRetrospective($userId, $key, $regen),
        };

        return redirect()->route('agent.intelligence.index');
    }
}
