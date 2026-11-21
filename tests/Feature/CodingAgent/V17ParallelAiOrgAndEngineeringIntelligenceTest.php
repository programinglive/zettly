<?php

namespace Tests\Feature\CodingAgent;

use App\Models\CodingAgentJob;
use App\Models\EngineeringImprovement;
use App\Models\User;
use App\Services\AiOrganization\AgentPerformanceScorecardService;
use App\Services\AiOrganization\AiCtoOrchestratorService;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use App\Services\ReleaseSafety\AutonomousDeliveryPipelineService;
use App\Services\ReleaseSafety\EngineeringStandardsAuditorService;
use App\Services\ReleaseSafety\IntegrationQueueService;
use App\Services\ReleaseSafety\PrReversibilityAssessor;
use App\Support\CodingAgentRoleRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class V17ParallelAiOrgAndEngineeringIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private string $workerToken;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'coding_agent.enabled' => true,
            'coding_agent.owner_email' => 'mahatma.mahardhika@programinglive.com',
            'coding_agent.github_token' => 'gh-test-token',
            'coding_agent.models' => [
                'hy4-flash:free',
                'qwen3-5-397b-a17b:free',
                'north-mini-code:free',
                'glm-4-7-flash:free',
            ],
            'coding_agent.default_model' => 'hy4-flash:free',
            'coding_agent.max_concurrent_jobs' => 2,
            'coding_agent.budgets.per_job_tokens' => 25000,
            'coding_agent.budgets.daily_tokens' => 500000,
        ]);

        $this->owner = User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
            'email_verified_at' => now(),
        ]);
        config(['coding_agent.owner_user_id' => $this->owner->id]);

        $this->workerToken = $this->owner->createToken('worker', ['coding-agent:worker'])->plainTextToken;
    }

    public function test_parallel_dag_execution_two_concurrent_slots_file_overlap_guard_and_integration_queue(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);
        $integrationQueue = app(IntegrationQueueService::class);

        // Launch a parallel DAG objective with 3 tracks:
        // - backend_engineer (app/Services/OrderService.php)
        // - frontend_engineer (resources/js/Pages/Orders.jsx)
        // - database_engineer (overlapping app/Services/OrderService.php -> must be skipped while backend_engineer is active!)
        $dag = $orchestrator->startParallelObjective(
            $this->owner->id,
            'zettly',
            'Build parallel Order module with backend service and frontend view',
            [
                [
                    'role' => 'backend_engineer',
                    'expected_files' => ['app/Services/OrderService.php'],
                ],
                [
                    'role' => 'database_engineer',
                    'expected_files' => ['app/Services/OrderService.php'],
                ],
                [
                    'role' => 'frontend_engineer',
                    'expected_files' => ['resources/js/Pages/Orders.jsx'],
                ],
            ]
        );

        $jobs = $dag['jobs'];
        $this->assertSame('PARALLEL_FULL', $dag['routing_profile']);

        // 1. Complete AI CTO & Software Architect sequential root nodes
        $cCto = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('ai_cto', $cCto['role']);
        $orchestrator->completeRoleJob($jobs['ai_cto'], ['test_summary' => 'DAG plan ready']);

        $cArch = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('software_architect', $cArch['role']);
        $orchestrator->completeRoleJob($jobs['software_architect'], ['test_summary' => 'Interfaces locked']);

        // 2. Now all 3 parallel tracks are dependency-unblocked, while qa_engineer remains blocked!
        // Claim Slot 1 -> backend_engineer
        $slot1 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('backend_engineer', $slot1['role']);
        $this->assertSame('slot-1', $slot1['worktree_slot']);

        // Claim Slot 2 -> database_engineer has overlapping expected_files ('app/Services/OrderService.php') with active slot-1,
        // so the scheduler MUST skip database_engineer and claim frontend_engineer in slot-2!
        $slot2 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('frontend_engineer', $slot2['role']);
        $this->assertSame('slot-2', $slot2['worktree_slot']);
        $this->assertNotSame($slot1['worktree_name'], $slot2['worktree_name']);

        // Claim Slot 3 -> refused with 204 because max_concurrent_jobs = 2!
        $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertNoContent();

        // Complete backend_engineer & frontend_engineer
        $shaBackend = str_repeat('1', 40);
        $shaFrontend = str_repeat('2', 40);
        $orchestrator->completeRoleJob($jobs['backend_engineer'], [
            'branch' => "agent/job-{$jobs['backend_engineer']->id}",
            'commit_sha' => $shaBackend,
            'changed_files' => ['app/Services/OrderService.php', 'tests/Feature/OrderServiceTest.php'],
            'diff_text' => '+ class OrderService {}',
            'tests_passed' => true,
            'telemetry' => ['total_tokens' => 1100, 'duration_ms' => 5200],
        ]);
        $orchestrator->completeRoleJob($jobs['frontend_engineer'], [
            'branch' => "agent/job-{$jobs['frontend_engineer']->id}",
            'commit_sha' => $shaFrontend,
            'changed_files' => ['resources/js/Pages/Orders.jsx', 'resources/js/Pages/Orders.test.js'],
            'diff_text' => '+ export default function Orders() {}',
            'tests_passed' => true,
            'telemetry' => ['total_tokens' => 950, 'duration_ms' => 4800],
        ]);

        // QA Engineer is STILL blocked because database_engineer hasn't completed yet!
        $slotDb = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('database_engineer', $slotDb['role']);
        $orchestrator->completeRoleJob($jobs['database_engineer'], [
            'branch' => "agent/job-{$jobs['database_engineer']->id}",
            'commit_sha' => str_repeat('3', 40),
            'changed_files' => ['app/Models/OrderNote.php', 'tests/Feature/OrderNoteTest.php'],
            'diff_text' => '+ class OrderNote {}',
            'tests_passed' => true,
            'telemetry' => ['total_tokens' => 700, 'duration_ms' => 3900],
        ]);

        // Now QA Engineer convergence node is unblocked!
        $claimQa = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame('qa_engineer', $claimQa['role']);

        // 3. Integration Queue Verification:
        // (a) Combined test failure blocks integration even when individual branch tests passed
        $failedCombined = $integrationQueue->integrateBranches(
            [$jobs['backend_engineer']->fresh(), $jobs['frontend_engineer']->fresh()],
            ['combined_tests_passed' => false]
        );
        $this->assertFalse($failedCombined['integrated']);
        $this->assertSame('COMBINED_TESTS_FAILED', $failedCombined['stage']);

        // (b) Clean parallel branches pass combined tests, Engineering Standards Audit, and 8-Dimension Reversibility
        $integrated = $integrationQueue->integrateBranches([
            $jobs['backend_engineer']->fresh(),
            $jobs['frontend_engineer']->fresh(),
            $jobs['database_engineer']->fresh(),
        ]);
        $this->assertTrue($integrated['integrated']);
        $this->assertSame('INTEGRATED_VERIFIED', $integrated['status']);
        $this->assertSame('PASS', $integrated['standards_audit']['result']);
        $this->assertSame(PrReversibilityAssessor::REVERSIBLE, $integrated['reversibility_assessment']['classification']);
    }

    public function test_integration_queue_blocks_sensitive_conflicts_and_blocking_standards_violations(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);
        $integrationQueue = app(IntegrationQueueService::class);
        $auditor = app(EngineeringStandardsAuditorService::class);

        $dag = $orchestrator->startParallelObjective(
            $this->owner->id,
            'zettly',
            'Test sensitive conflict blocking',
            [
                ['role' => 'backend_engineer'],
                ['role' => 'database_engineer'],
            ]
        );

        // Both parallel branches modify the same sensitive migration file -> MUST be blocked from auto-resolution!
        $b1 = $dag['jobs']['backend_engineer'];
        $b2 = $dag['jobs']['database_engineer'];
        $b1->update([
            'status' => 'completed',
            'tests_passed' => true,
            'commit_sha' => str_repeat('a', 40),
            'artifact_output' => [
                'changed_files' => ['database/migrations/2026_11_22_000009_shared.php', 'tests/Feature/MigTest.php'],
                'diff_text' => '+ // branch 1',
            ],
        ]);
        $b2->update([
            'status' => 'completed',
            'tests_passed' => true,
            'commit_sha' => str_repeat('b', 40),
            'artifact_output' => [
                'changed_files' => ['database/migrations/2026_11_22_000009_shared.php', 'tests/Feature/MigTest.php'],
                'diff_text' => '+ // branch 2',
            ],
        ]);

        $sensitiveBlocked = $integrationQueue->integrateBranches([$b1, $b2], [
            'has_merge_conflict' => true,
            'auto_resolve_deterministic' => true,
        ]);
        $this->assertFalse($sensitiveBlocked['integrated']);
        $this->assertSame('UNSAFE_SENSITIVE_CONFLICT', $sensitiveBlocked['stage']);

        // Standards violation in diff (e.g., embedded secret or shell_exec) blocks integration
        $fakeToken = 'ghp_'.str_repeat('x', 28);
        $auditFail = $auditor->auditChanges(
            ['app/Services/UnsafeService.php', 'tests/Feature/UnsafeTest.php'],
            "+ \$out = shell_exec(\$cmd);\n+ \$token = '{$fakeToken}';"
        );
        $this->assertSame('FAIL', $auditFail['result']);
        $this->assertGreaterThanOrEqual(2, $auditFail['summary']['blocking']);
    }

    public function test_intelligent_model_routing_token_budgets_and_agent_performance_scorecard(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);
        $scorecardService = app(AgentPerformanceScorecardService::class);

        // 1. Model Tier Selection (FAST, CODING, REASONING, REVIEW)
        $fastTier = CodingAgentRoleRegistry::selectModelPolicyForRole('documentation_research_agent', 'LOW');
        $this->assertSame('FAST', $fastTier['tier']);

        $reasoningTier = CodingAgentRoleRegistry::selectModelPolicyForRole('software_architect', 'HIGH');
        $this->assertSame('REASONING', $reasoningTier['tier']);
        $this->assertSame('qwen3-5-397b-a17b:free', $reasoningTier['primary_model']);

        $reviewTier = CodingAgentRoleRegistry::selectModelPolicyForRole('security_code_reviewer', 'MEDIUM');
        $this->assertSame('REVIEW', $reviewTier['tier']);

        // 2. Per-Job Token Budget Enforcement
        $wf = $orchestrator->startObjective($this->owner->id, 'zettly', 'Budget enforcement test', ['routing_profile' => 'FAST']);
        $devJob = $wf['jobs']['developer'];
        $devJob->update(['token_budget' => 1000]);

        $budgetExceeded = $orchestrator->completeRoleJob($devJob, [
            'branch' => 'agent/over-budget',
            'commit_sha' => str_repeat('d', 40),
            'changed_files' => ['docs/README.md'],
            'diff_text' => '+ docs',
            'tests_passed' => true,
            'telemetry' => ['total_tokens' => 2500, 'duration_ms' => 4000],
        ]);
        $this->assertSame('failed', $budgetExceeded->status);
        $this->assertStringContainsString('Execution token budget exceeded', (string) $budgetExceeded->test_summary);

        // 3. Agent Performance Scorecard never auto-expands permissions
        $scorecard = $scorecardService->evaluate($this->owner->id);
        $this->assertFalse($scorecard['permissions_auto_expanded']);
        $this->assertArrayHasKey('developer', $scorecard['by_role']);
        $this->assertFalse($scorecard['by_role']['developer']['permissions_auto_expanded']);
    }

    public function test_daily_weekly_monthly_retrospectives_idempotency_versioning_improvements_and_lessons(): void
    {
        $intelligence = app(EngineeringIntelligenceService::class);
        $orchestrator = app(AiCtoOrchestratorService::class);

        // 1. Quiet period with zero activity produces factual 'no_activity' report without fabricated metrics
        $quietDaily = $intelligence->generateDailyRetrospective($this->owner->id, '2026-10-01');
        $this->assertSame('no_activity', $quietDaily->status);
        $this->assertSame('NOT_MEASURED', $quietDaily->metrics['test_pass_rate_percent']);
        $this->assertSame('NOT_MEASURED', $quietDaily->metrics['mean_task_duration_ms']);
        $this->assertSame(1, $quietDaily->version);

        // Idempotency: calling again without forceRegenerate returns the exact same record (version 1)
        $sameDaily = $intelligence->generateDailyRetrospective($this->owner->id, '2026-10-01', false);
        $this->assertSame($quietDaily->id, $sameDaily->id);
        $this->assertSame(1, $sameDaily->version);

        // 2. Seed real activity (verified jobs + recurring failure pattern with secret redaction test)
        $wf = $orchestrator->startObjective($this->owner->id, 'zettly', 'Retrospective evidence test', ['routing_profile' => 'FAST']);
        $orchestrator->completeRoleJob($wf['jobs']['developer'], [
            'branch' => 'agent/retro-1',
            'commit_sha' => str_repeat('e', 40),
            'changed_files' => ['docs/guide.md'],
            'diff_text' => '+ guide',
            'tests_passed' => true,
            'telemetry' => ['total_tokens' => 600, 'duration_ms' => 2500],
        ]);
        // Two failed QA jobs with the same root cause pattern -> triggers Recurring Problem Detector!
        $fakeSecret = 'ghp_'.str_repeat('z', 28);
        $orchestrator->failRoleJob($wf['jobs']['release_manager'], "Timeout connecting to staging database with secret {$fakeSecret}");
        $dupFail = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $wf['todos']['release_manager']->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Second failure',
            'client_request_id' => 'req-dup-fail-2',
            'status' => 'failed',
            'tests_passed' => false,
            'test_summary' => "Timeout connecting to staging database with secret {$fakeSecret}",
        ]);
        $this->assertSame('failed', $dupFail->status);

        $todayWib = now('Asia/Jakarta')->format('Y-m-d');
        $activeDaily = $intelligence->generateDailyRetrospective($this->owner->id, $todayWib);
        $this->assertSame('published', $activeDaily->status);
        $this->assertGreaterThanOrEqual(1, $activeDaily->metrics['verified_agent_jobs']);
        $this->assertGreaterThanOrEqual(1, $activeDaily->metrics['recurring_problems_detected']);
        // Verify sensitive token was redacted from retrospective markdown!
        $this->assertStringNotContainsString($fakeSecret, $activeDaily->markdown_content);

        // Regeneration increments version and preserves prior version in version_history
        $regenerated = $intelligence->generateDailyRetrospective($this->owner->id, $todayWib, true);
        $this->assertSame(2, $regenerated->version);
        $this->assertCount(1, $regenerated->version_history);

        // Weekly & Monthly Retrospectives
        $weekly = $intelligence->generateWeeklyRetrospective($this->owner->id, now('Asia/Jakarta')->format('o-\WW'));
        $this->assertSame('weekly', $weekly->period_kind);

        $monthly = $intelligence->generateMonthlyRetrospective($this->owner->id, now('Asia/Jakarta')->format('Y-m'));
        $this->assertSame('monthly', $monthly->period_kind);

        // 3. Improvement Backlog Deduplication & 11-State Lifecycle + Effectiveness Measurement
        $improvements = EngineeringImprovement::query()->where('user_id', $this->owner->id)->get();
        $this->assertCount(1, $improvements);
        $imp = $improvements->first();
        $this->assertSame(2, $imp->occurrence_count);

        $imp = $intelligence->transitionImprovement($imp, 'APPROVED_BY_POLICY');
        $this->assertSame('APPROVED_BY_POLICY', $imp->status);
        $imp = $intelligence->transitionImprovement($imp, 'EFFECTIVE', [
            'recurrences_before' => 2,
            'recurrences_after' => 0,
        ]);
        $this->assertSame('EFFECTIVE', $imp->status);
        $this->assertSame(0, $imp->effectiveness_metrics['recurrences_after']);

        // 4. Engineering Memory (Lessons Learned) with deduplication, versioning & redaction
        $lesson1 = $intelligence->recordLesson($this->owner->id, [
            'title' => 'Always use PostgreSQL dev_zettly for migration staging verification',
            'category' => 'database_parity',
            'affected_system' => 'zettly-staging',
            'confidence' => 'confirmed',
            'context' => "SQLite staging missed PostgreSQL-specific DDL checks; token {$fakeSecret} must never be stored.",
            'source_evidence' => ['commit' => '658ad954ff9e', 'database' => 'dev_zettly'],
        ]);
        $this->assertSame(1, $lesson1->version);
        $this->assertStringNotContainsString($fakeSecret, $lesson1->context);

        // Duplicate lesson title updates version instead of creating duplicate row
        $lesson2 = $intelligence->recordLesson($this->owner->id, [
            'title' => 'Always use PostgreSQL dev_zettly for migration staging verification',
            'confidence' => 'confirmed',
            'context' => 'Verified across v1.6.1 and v1.7.0 deployments.',
            'source_evidence' => ['commit' => '658ad954ff9e', 'verified_releases' => ['v1.6.1', 'v1.7.0']],
        ]);
        $this->assertSame($lesson1->id, $lesson2->id);
        $this->assertSame(2, $lesson2->version);

        // 5. CLI & Web Dashboard verification
        $this->artisan('engineering:retrospective', ['kind' => 'daily', '--period' => $todayWib])
            ->assertExitCode(0);
        $this->artisan('engineering:retrospective', ['kind' => 'scorecard'])
            ->assertExitCode(0);

        $this->actingAs($this->owner)
            ->get('/agent/intelligence')
            ->assertOk();
    }
}
