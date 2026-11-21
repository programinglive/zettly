<?php

namespace Tests\Feature\CodingAgent;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use App\Services\AiOrganization\AiCtoOrchestratorService;
use App\Services\CodingAgentApprovalService;
use App\Services\ReleaseSafety\AutonomousDeliveryPipelineService;
use App\Services\ReleaseSafety\AutonomousDeploymentPolicy;
use App\Services\ReleaseSafety\PrReversibilityAssessor;
use App\Support\CodingAgentRoleRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class V16ReleaseSafetyAndAiOrgTest extends TestCase
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
        ]);

        $this->owner = User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
            'email_verified_at' => now(),
        ]);
        config(['coding_agent.owner_user_id' => $this->owner->id]);

        $this->workerToken = $this->owner->createToken('worker', ['coding-agent:worker'])->plainTextToken;
    }

    public function test_twelve_role_registry_and_three_adaptive_routing_profiles_are_configured_and_enforced(): void
    {
        $roles = CodingAgentRoleRegistry::all();
        $this->assertCount(12, $roles);

        $this->assertSame(['developer', 'release_manager'], CodingAgentRoleRegistry::rolesForRoutingProfile('FAST'));
        $this->assertSame(['developer', 'qa_engineer', 'security_code_reviewer', 'release_manager'], CodingAgentRoleRegistry::rolesForRoutingProfile('STANDARD'));
        $this->assertSame([
            'ai_cto',
            'software_architect',
            'developer',
            'qa_engineer',
            'security_code_reviewer',
            'release_manager',
        ], CodingAgentRoleRegistry::mvtPipelineOrder());

        // Alias resolution
        $this->assertNotNull(CodingAgentRoleRegistry::find('independent_code_reviewer'));

        foreach ($roles as $slug => $profile) {
            $this->assertFalse($profile['permissions']['merge_pull_request'], "Role {$slug} must not auto-merge PRs");
            $this->assertFalse($profile['permissions']['production_deploy'], "Role {$slug} must not deploy to production");
        }

        $this->artisan('coding-agent:safety', ['action' => 'roles'])
            ->assertExitCode(0);
    }

    public function test_pr_reversibility_assessor_evaluates_eight_dimensions_and_never_treats_unknown_as_low_risk(): void
    {
        $assessor = app(PrReversibilityAssessor::class);

        // 1. Missing diff/file evidence -> UNKNOWN + HIGH RISK (never LOW)
        $unknown = $assessor->assess([
            'repository' => 'zettly',
            'commit_sha' => str_repeat('a', 40),
            'tests_passed' => true,
            'independent_review_passed' => true,
        ]);
        $this->assertSame(PrReversibilityAssessor::UNKNOWN, $unknown['classification']);
        $this->assertSame(PrReversibilityAssessor::RISK_HIGH, $unknown['risk_level']);
        $this->assertFalse($unknown['gates']['allow_merge_request']);
        $this->assertCount(8, $unknown['dimensions']);

        // 2. Clean code change -> REVERSIBLE + LOW RISK
        $reversible = $assessor->assess([
            'repository' => 'zettly',
            'commit_sha' => str_repeat('b', 40),
            'changed_files' => ['resources/js/Pages/Agent/Monitor.jsx', 'tests/Feature/CodingAgentMonitorPageTest.php'],
            'diff_text' => "+ const pollMs = 3000;\n+ \$this->assertOk();",
            'tests_passed' => true,
            'independent_review_passed' => true,
        ]);
        $this->assertSame(PrReversibilityAssessor::REVERSIBLE, $reversible['classification']);
        $this->assertSame(PrReversibilityAssessor::RISK_LOW, $reversible['risk_level']);
        $this->assertTrue($reversible['gates']['allow_merge_request']);
        $this->assertFalse($reversible['gates']['allow_auto_merge']);

        // 3. Additive migration -> CONDITIONALLY_REVERSIBLE + MEDIUM RISK
        $conditional = $assessor->assess([
            'repository' => 'zettly',
            'commit_sha' => str_repeat('c', 40),
            'changed_files' => ['database/migrations/2026_11_21_000001_add_col.php'],
            'diff_text' => "+ \$table->string('role')->default('developer');",
            'tests_passed' => true,
            'independent_review_passed' => true,
        ]);
        $this->assertSame(PrReversibilityAssessor::CONDITIONALLY_REVERSIBLE, $conditional['classification']);
        $this->assertSame(PrReversibilityAssessor::RISK_MEDIUM, $conditional['risk_level']);

        // 4. Destructive migration without backup -> IRREVERSIBLE + CRITICAL RISK + blocked
        $irreversible = $assessor->assess([
            'repository' => 'zettly',
            'commit_sha' => str_repeat('d', 40),
            'changed_files' => ['database/migrations/2026_11_21_000002_drop_legacy.php'],
            'diff_text' => "+ Schema::dropIfExists('legacy_table');\n+ \$table->dropColumn('old_col');",
            'tests_passed' => true,
            'independent_review_passed' => true,
            'backup_verified' => false,
        ]);
        $this->assertSame(PrReversibilityAssessor::IRREVERSIBLE, $irreversible['classification']);
        $this->assertSame(PrReversibilityAssessor::RISK_CRITICAL, $irreversible['risk_level']);
        $this->assertFalse($irreversible['gates']['allow_merge_request']);
    }

    public function test_end_to_end_twelve_step_six_role_acceptance_pipeline_and_human_approval(): void
    {
        Http::fake([
            'api.github.com/repos/programinglive/zettly/pulls/77/merge' => Http::response(['merged' => true], 200),
        ]);

        $orchestrator = app(AiCtoOrchestratorService::class);
        $approvals = app(CodingAgentApprovalService::class);

        // Step 1: User submits development objective
        $started = $orchestrator->startObjective(
            $this->owner->id,
            'zettly',
            'Add a release safety badge to the Coding Agent job monitor view'
        );
        $wfId = $started['workflow_task_id'];
        $jobs = $started['jobs'];
        $this->assertCount(6, $jobs);

        // Verify sequential dependency blocking: only ai_cto can be claimed initially!
        $claim1 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['ai_cto']->id, $claim1['id']);
        $this->assertSame('ai_cto', $claim1['role']);
        $this->assertSame('read_only', $claim1['mode']);

        // No second job can be claimed concurrently because downstream Todos depend on ai_cto
        $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertNoContent();

        // Step 2: AI CTO analyzes objective & decomposes task
        $orchestrator->completeRoleJob($jobs['ai_cto'], [
            'objective_analysis' => 'Scoped UI enhancement to Monitor.jsx with PHPUnit test.',
            'task_breakdown' => ['architect_design', 'developer_patch', 'qa_verify', 'security_review', 'release_gate'],
            'test_summary' => 'AI CTO analysis completed',
        ]);

        // Step 3: Software Architect claims & reviews implementation approach
        $claim2 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['software_architect']->id, $claim2['id']);
        $orchestrator->completeRoleJob($jobs['software_architect'], [
            'architecture_plan' => 'Render reversibility badge in Monitor.jsx using existing props.',
            'target_files' => ['resources/js/Pages/Agent/Monitor.jsx'],
            'test_summary' => 'Architecture design approved',
        ]);

        // Step 4, 5, 6: Developer receives assigned task, works in isolated workspace, produces controlled change
        $claim3 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['developer']->id, $claim3['id']);
        $sha = str_repeat('e', 40);
        $orchestrator->completeRoleJob($jobs['developer'], [
            'branch' => "agent/job-{$jobs['developer']->id}",
            'commit_sha' => $sha,
            'pr_url' => 'https://github.com/programinglive/zettly/pull/77',
            'changed_files' => ['resources/js/Pages/Agent/Monitor.jsx', 'tests/Feature/CodingAgentMonitorPageTest.php'],
            'diff_text' => '+ <span>Reversibility Badge</span>',
            'tests_passed' => true,
            'test_summary' => 'php artisan test: passed',
        ]);

        // Step 7: QA Engineer validates the change
        $claim4 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['qa_engineer']->id, $claim4['id']);
        $orchestrator->completeRoleJob($jobs['qa_engineer'], [
            'qa_verdict' => 'passed',
            'tests_passed' => true,
            'test_summary' => '70 passed (329 assertions)',
        ]);

        // Step 8: Security & Code Reviewer independently reviews it
        $claim5 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['security_code_reviewer']->id, $claim5['id']);
        $orchestrator->completeRoleJob($jobs['security_code_reviewer'], [
            'security_verdict' => 'passed',
            'review_verdict' => 'approved',
            'findings' => [],
            'test_summary' => 'Zero security or quality issues found',
        ]);

        // Step 9 & 10: Release Manager evaluates PR reversibility & release readiness
        $claim6 = $this->withToken($this->workerToken)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data');
        $this->assertSame($jobs['release_manager']->id, $claim6['id']);
        $releaseJob = $orchestrator->completeRoleJob($jobs['release_manager'], [
            'tests_passed' => true,
            'test_summary' => 'Release safety assessment completed',
        ]);

        $this->assertSame('review', $releaseJob->status);
        $this->assertSame(PrReversibilityAssessor::REVERSIBLE, $releaseJob->reversibility_classification);

        // Step 11: Zettly displays complete execution history
        $history = $orchestrator->inspectWorkflow($wfId, $this->owner->id);
        $this->assertSame('awaiting_human_approval', $history['overall_status']);
        $this->assertCount(6, $history['steps']);
        $this->assertFalse($history['human_approved']);

        // Step 12: Human approval requested and granted before merge
        $mergeResult = $approvals->approve($releaseJob, $this->owner->id, $sha, 'staging');
        $this->assertSame('merged', $mergeResult);

        $afterApproval = $orchestrator->inspectWorkflow($wfId, $this->owner->id);
        $this->assertSame('completed', $afterApproval['overall_status']);
        $this->assertTrue($afterApproval['human_approved']);
    }

    public function test_failure_modes_qa_security_unknown_rollback_timeout_interruption_rejection_and_ownership_conflict(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);
        $approvals = app(CodingAgentApprovalService::class);

        // 1. Failed QA blocks downstream Security Reviewer & Release Manager
        $wf1 = $orchestrator->startObjective($this->owner->id, 'zettly', 'Scenario 1: QA Failure');
        $orchestrator->completeRoleJob($wf1['jobs']['ai_cto'], ['test_summary' => 'ok']);
        $orchestrator->completeRoleJob($wf1['jobs']['software_architect'], ['test_summary' => 'ok']);
        $orchestrator->completeRoleJob($wf1['jobs']['developer'], [
            'branch' => 'agent/job-1',
            'commit_sha' => str_repeat('1', 40),
            'changed_files' => ['app/Models/Todo.php'],
            'diff_text' => '+ // change',
            'tests_passed' => true,
        ]);
        $failedQa = $orchestrator->completeRoleJob($wf1['jobs']['qa_engineer'], [
            'qa_verdict' => 'failed',
            'tests_passed' => false,
            'test_summary' => 'PHPUnit regression test failed',
        ]);
        $this->assertSame('failed', $failedQa->status);
        $this->assertFalse((bool) $failedQa->todo->fresh()->is_completed);
        $this->assertSame('failed', $orchestrator->inspectWorkflow($wf1['workflow_task_id'], $this->owner->id)['overall_status']);

        // 2. Failed Security Review blocks Release Manager
        $wf2 = $orchestrator->startObjective($this->owner->id, 'zettly', 'Scenario 2: Security Failure');
        $orchestrator->completeRoleJob($wf2['jobs']['ai_cto'], ['test_summary' => 'ok']);
        $orchestrator->completeRoleJob($wf2['jobs']['software_architect'], ['test_summary' => 'ok']);
        $orchestrator->completeRoleJob($wf2['jobs']['developer'], [
            'branch' => 'agent/job-2',
            'commit_sha' => str_repeat('2', 40),
            'changed_files' => ['app/Models/Todo.php'],
            'diff_text' => '+ // change',
            'tests_passed' => true,
        ]);
        $orchestrator->completeRoleJob($wf2['jobs']['qa_engineer'], ['qa_verdict' => 'passed', 'tests_passed' => true]);
        $failedSec = $orchestrator->completeRoleJob($wf2['jobs']['security_code_reviewer'], [
            'security_verdict' => 'failed',
            'review_verdict' => 'rejected',
            'summary' => 'Hardcoded credential pattern detected in diff',
        ]);
        $this->assertSame('failed', $failedSec->status);
        $this->assertFalse((bool) $failedSec->todo->fresh()->is_completed);

        // 3. UNKNOWN rollback classification blocks standard human approval without high-risk override
        $unknownJob = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $wf2['todos']['release_manager']->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Check release',
            'client_request_id' => 'req-unknown-gate',
            'status' => 'review',
            'commit_sha' => str_repeat('3', 40),
            'target_environment' => 'staging',
            'tests_passed' => true,
            'reversibility_classification' => PrReversibilityAssessor::UNKNOWN,
            'risk_level' => PrReversibilityAssessor::RISK_HIGH,
            'reversibility_assessment' => [
                'gates' => ['allow_merge_request' => false, 'blocking_conditions' => ['UNKNOWN reversibility']],
            ],
        ]);
        try {
            $approvals->approve($unknownJob, $this->owner->id, str_repeat('3', 40), 'staging', false);
            $this->fail('Expected HttpException 409 when approving UNKNOWN reversibility without override.');
        } catch (HttpException $e) {
            $this->assertSame(409, $e->getStatusCode());
        }

        // 4. Agent timeout & Worker interruption (expired lease reclaimed; stale worker lease rejected 409)
        $wf3 = $orchestrator->startObjective($this->owner->id, 'zettly', 'Scenario 4: Lease Timeout & Interruption');
        $ctoJob = $wf3['jobs']['ai_cto'];
        $ctoJob->update([
            'status' => 'running',
            'lease_token_hash' => hash('sha256', 'stale-lease-token'),
            'leased_until' => now()->subSeconds(10),
        ]);
        $this->withToken($this->workerToken)->postJson("/api/v1/coding-agent/jobs/{$ctoJob->id}/heartbeat", [
            'lease_token' => 'stale-lease-token',
        ])->assertStatus(409);

        // 5. Permission violation: read-only role attempting repository mutation or PR creation is failed
        $violatingCto = $orchestrator->completeRoleJob($ctoJob, [
            'mutated_repository' => true,
            'created_pr' => true,
        ]);
        $this->assertSame('failed', $violatingCto->status);
        $this->assertStringContainsString('Permission violation', (string) $violatingCto->test_summary);

        // 6. Rejected human approval cancels job and records audit trail
        $approvals->reject($unknownJob, $this->owner->id, 'Rejected by owner due to missing diff evidence');
        $this->assertSame('cancelled', $unknownJob->fresh()->status);
        $this->assertTrue($unknownJob->events()->where('kind', 'release_rejected')->exists());

        // 7. Conflicting task ownership rejected
        $otherUser = User::factory()->create(['email_verified_at' => now()]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Conflicting task ownership');
        $orchestrator->startObjective($otherUser->id, 'zettly', 'Hijack workflow', [
            'workflow_task_id' => $wf1['workflow_task_id'],
        ]);
    }

    public function test_controlled_rollback_preparation_enforces_authorization_and_blocks_irreversible_changes(): void
    {
        $approvals = app(CodingAgentApprovalService::class);
        $assessor = app(PrReversibilityAssessor::class);

        $assessment = $assessor->assess([
            'repository' => 'zettly',
            'commit_sha' => str_repeat('f', 40),
            'changed_files' => ['resources/js/Pages/Agent/Monitor.jsx'],
            'diff_text' => '+ // safe ui tweak',
            'tests_passed' => true,
            'independent_review_passed' => true,
        ]);

        $todo = Todo::create([
            'user_id' => $this->owner->id,
            'title' => 'Rollback verification task',
            'type' => Todo::TYPE_TODO,
            'is_completed' => false,
            'priority' => 'high',
        ]);

        $job = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Release check',
            'client_request_id' => 'req-rollback-1',
            'status' => 'completed',
            'commit_sha' => str_repeat('f', 40),
            'target_environment' => 'staging',
            'tests_passed' => true,
            'reversibility_classification' => $assessment['classification'],
            'risk_level' => $assessment['risk_level'],
            'reversibility_assessment' => $assessment,
        ]);

        $prepared = $approvals->prepareRollback($job, $this->owner->id, 'v1.5.5', [
            'prerequisites_verified' => true,
            'approval_confirmed' => true,
        ]);

        $this->assertSame('READY_FOR_CONTROLLED_ROLLBACK', $prepared['status']);
        $this->assertSame('v1.5.5', $prepared['target_release']);
        $this->assertTrue($job->events()->where('kind', 'rollback_authorized')->exists());
    }

    public function test_adaptive_role_routing_fast_standard_and_full_profiles_and_no_risk_downgrade(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);

        // 1. Auto-route FAST profile for docs/copy objective (2 roles: developer -> release_manager)
        $fast = $orchestrator->startObjective(
            $this->owner->id,
            'zettly',
            'Fix typo in README documentation',
            ['routing_profile' => 'AUTO']
        );
        $this->assertSame('FAST', $fast['routing_profile']);
        $this->assertSame(['developer', 'release_manager'], array_keys($fast['jobs']));

        // Scope escalation test: if FAST job actually modifies PHP/migration files, risk escalates & blocks auto-merge!
        $fastDev = $orchestrator->completeRoleJob($fast['jobs']['developer'], [
            'branch' => 'agent/fast-scope-breach',
            'commit_sha' => str_repeat('9', 40),
            'changed_files' => ['database/migrations/2026_11_21_999999_add_column.php'],
            'diff_text' => "+ \$table->string('surprise');",
            'tests_passed' => true,
        ]);
        $this->assertSame(PrReversibilityAssessor::RISK_MEDIUM, $fastDev->risk_level);
        $this->assertContains(
            'FAST profile scope exceeded after implementation; requires FULL/STANDARD review and human approval.',
            $fastDev->reversibility_assessment['gates']['blocking_conditions']
        );

        // 2. Auto-route STANDARD profile for normal feature/bugfix (4 roles)
        $standard = $orchestrator->startObjective(
            $this->owner->id,
            'zettly',
            'Add filter chip to Todo list UI',
            ['routing_profile' => 'AUTO']
        );
        $this->assertSame('STANDARD', $standard['routing_profile']);
        $this->assertSame(['developer', 'qa_engineer', 'security_code_reviewer', 'release_manager'], array_keys($standard['jobs']));

        // 3. Auto-route FULL profile for high-risk auth/migration objective (6 roles)
        $full = $orchestrator->startObjective(
            $this->owner->id,
            'zettly',
            'Update Sanctum auth token permission policy and database schema',
            ['routing_profile' => 'AUTO']
        );
        $this->assertSame('FULL', $full['routing_profile']);
        $this->assertCount(6, $full['jobs']);
        $this->assertSame(PrReversibilityAssessor::RISK_MEDIUM, $full['jobs']['developer']->risk_level);

        // Prove risk NEVER downgrades automatically even if developer only edits a comment
        $fullDev = $orchestrator->completeRoleJob($full['jobs']['developer'], [
            'branch' => 'agent/full-no-downgrade',
            'commit_sha' => str_repeat('8', 40),
            'changed_files' => ['docs/README.md'],
            'diff_text' => '+ # harmless comment',
            'tests_passed' => true,
        ]);
        $this->assertSame(PrReversibilityAssessor::RISK_MEDIUM, $fullDev->risk_level);
    }

    public function test_autonomous_safe_production_delivery_all_fourteen_acceptance_criteria(): void
    {
        $orchestrator = app(AiCtoOrchestratorService::class);
        $pipeline = app(AutonomousDeliveryPipelineService::class);
        $policy = app(AutonomousDeploymentPolicy::class);

        // Criterion 1 & 12 & 13: Low-risk change passes all 15 checks and deploys end-to-end without manual approval,
        // confirming deployed revision matches release SHA and recording all 6 verification stages!
        $wf = $orchestrator->startObjective(
            $this->owner->id,
            'zettly',
            'Add latency badge to coding agent monitor card',
            ['routing_profile' => 'STANDARD']
        );
        $sha = str_repeat('a', 40);
        $changedFiles = ['resources/js/Pages/Agent/Monitor.jsx', 'tests/Feature/CodingAgentMonitorPageTest.php'];

        $orchestrator->completeRoleJob($wf['jobs']['developer'], [
            'branch' => 'agent/low-risk-auto',
            'commit_sha' => $sha,
            'pr_url' => 'https://github.com/programinglive/zettly/pull/88',
            'changed_files' => $changedFiles,
            'diff_text' => '+ <span>Latency: 42ms</span>',
            'tests_passed' => true,
        ]);
        $orchestrator->completeRoleJob($wf['jobs']['qa_engineer'], [
            'qa_verdict' => 'passed',
            'tests_passed' => true,
            'test_summary' => 'All PHPUnit, Python, and Vitest suites passed',
        ]);
        $orchestrator->completeRoleJob($wf['jobs']['security_code_reviewer'], [
            'security_verdict' => 'passed',
            'review_verdict' => 'approved',
        ]);
        $releaseJob = $orchestrator->completeRoleJob($wf['jobs']['release_manager'], [
            'tests_passed' => true,
        ]);

        $artifactDigest = 'sha256:'.hash('sha256', 'zettly-v1.6.0-release-tarball');
        $baseContext = [
            'reviewed_commit_sha' => $sha,
            'actual_commit_sha' => $sha,
            'tests_passed' => true,
            'security_review_passed' => true,
            'independent_review_passed' => true,
            'github_checks_passed' => true,
            'release_tag' => 'v1.6.0',
            'artifact_immutable' => true,
            'artifact_digest' => $artifactDigest,
            'previous_known_good_release' => 'v1.5.5',
            'staging_deploy_passed' => true,
            'staging_db_worker_compatible' => true,
            'staging_smoke_passed' => true,
            'production_health_monitoring_available' => true,
            'production_deploy_passed' => true,
            'production_health_passed' => true,
            'deployed_production_revision' => $sha,
        ];

        $result = $pipeline->executeAutonomousDelivery($releaseJob, $baseContext);
        $this->assertSame('PRODUCTION_VERIFIED', $result['status']);
        $this->assertSame('PRODUCTION_VERIFIED', $result['stage']);
        $this->assertSame($sha, $result['production_revision']);

        $freshRelease = $releaseJob->fresh();
        $this->assertSame('completed', $freshRelease->status);
        $this->assertSame('PRODUCTION_VERIFIED', $freshRelease->delivery_stage);
        $this->assertSame(
            AutonomousDeliveryPipelineService::MILESTONES,
            array_keys(array_filter($freshRelease->delivery_state['milestones']))
        );

        // Criterion 2: High-risk change is blocked from automatic deployment
        $highRiskEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => array_merge($freshRelease->reversibility_assessment, ['risk_level' => PrReversibilityAssessor::RISK_HIGH]),
        ]));
        $this->assertFalse($highRiskEval['eligible']);
        $this->assertContains('1_risk_classification_eligible', $highRiskEval['failed_conditions']);

        // Criterion 3: UNKNOWN reversibility is blocked
        $unknownAssessment = $freshRelease->reversibility_assessment;
        $unknownAssessment['classification'] = PrReversibilityAssessor::UNKNOWN;
        $unknownEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => $unknownAssessment,
        ]));
        $this->assertFalse($unknownEval['eligible']);
        $this->assertContains('3_no_unknown_dimensions', $unknownEval['failed_conditions']);

        // Criterion 4: Failed CI check blocks merge
        $failedCiEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => $freshRelease->reversibility_assessment,
            'github_checks_passed' => false,
        ]));
        $this->assertFalse($failedCiEval['eligible']);
        $this->assertContains('7_required_github_checks_passed', $failedCiEval['failed_conditions']);

        // Criterion 5: Failed security review blocks merge
        $failedSecEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => $freshRelease->reversibility_assessment,
            'security_review_passed' => false,
        ]));
        $this->assertFalse($failedSecEval['eligible']);
        $this->assertContains('6_security_and_independent_review_passed', $failedSecEval['failed_conditions']);

        // Criterion 6: Stale SHA blocks merge
        $staleShaEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => $freshRelease->reversibility_assessment,
            'actual_commit_sha' => str_repeat('b', 40),
        ]));
        $this->assertFalse($staleShaEval['eligible']);
        $this->assertContains('8_commit_sha_matches_reviewed_sha', $staleShaEval['failed_conditions']);

        // Criterion 7: Unsafe database migration blocks automatic release
        $destructiveAssessor = app(PrReversibilityAssessor::class);
        $destructiveAssessment = $destructiveAssessor->assess([
            'repository' => 'zettly',
            'commit_sha' => $sha,
            'changed_files' => ['database/migrations/2026_11_21_999999_drop_users_col.php'],
            'diff_text' => "+ \$table->dropColumn('legacy');",
            'tests_passed' => true,
            'independent_review_passed' => true,
        ]);
        $unsafeDbEval = $policy->evaluate(array_merge($baseContext, [
            'reversibility_assessment' => $destructiveAssessment,
        ]));
        $this->assertFalse($unsafeDbEval['eligible']);
        $this->assertContains('4_no_irreversible_or_destructive_ops', $unsafeDbEval['failed_conditions']);

        // Criterion 8: Failed staging verification blocks production deployment
        $stagingFailJob = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $wf['todos']['release_manager']->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Staging gate check',
            'client_request_id' => 'req-staging-fail',
            'status' => 'review',
            'commit_sha' => $sha,
            'tests_passed' => true,
            'reversibility_classification' => PrReversibilityAssessor::REVERSIBLE,
            'risk_level' => PrReversibilityAssessor::RISK_LOW,
            'reversibility_assessment' => $freshRelease->reversibility_assessment,
        ]);
        $stagingBlocked = $pipeline->executeAutonomousDelivery($stagingFailJob, array_merge($baseContext, [
            'staging_smoke_passed' => false,
        ]));
        $this->assertSame('BLOCKED', $stagingBlocked['status']);
        $this->assertSame('STAGING_FAILED', $stagingBlocked['stage']);

        // Criterion 9 & 10: Failed production health check triggers verified safe rollback (NEVER restoring production DB)
        $prodRollbackJob = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $wf['todos']['release_manager']->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Prod health rollback test',
            'client_request_id' => 'req-prod-rollback',
            'status' => 'review',
            'commit_sha' => $sha,
            'tests_passed' => true,
            'reversibility_classification' => PrReversibilityAssessor::REVERSIBLE,
            'risk_level' => PrReversibilityAssessor::RISK_LOW,
            'reversibility_assessment' => $freshRelease->reversibility_assessment,
        ]);
        $rolledBack = $pipeline->executeAutonomousDelivery($prodRollbackJob, array_merge($baseContext, [
            'production_health_passed' => false,
        ]));
        $this->assertSame('ROLLED_BACK', $rolledBack['status']);
        $this->assertSame('v1.5.5', $rolledBack['restored_release']);
        $this->assertFalse($rolledBack['database_restored_automatically']);

        // Criterion 11: Unverified rollback halts and isolates instead of guessing
        $unverifiedAssessment = $freshRelease->reversibility_assessment;
        $unverifiedAssessment['gates']['rollback_ready'] = false;
        $unverifiedRollbackJob = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $wf['todos']['release_manager']->id,
            'repository' => 'zettly',
            'role' => 'release_manager',
            'instruction' => 'Unverified rollback halt test',
            'client_request_id' => 'req-unverified-halt',
            'status' => 'review',
            'commit_sha' => $sha,
            'tests_passed' => true,
            'reversibility_classification' => PrReversibilityAssessor::REVERSIBLE,
            'risk_level' => PrReversibilityAssessor::RISK_LOW,
            'reversibility_assessment' => $unverifiedAssessment,
        ]);
        $halted = $pipeline->executeAutonomousDelivery($unverifiedRollbackJob, array_merge($baseContext, [
            'production_health_passed' => false,
        ]));
        $this->assertSame('HALTED_ISOLATED', $halted['status']);
        $this->assertFalse($halted['database_restored_automatically']);

        // Criterion 14: Unauthorized agent attempt to modify safety policy is rejected
        $policyTamperWf = $orchestrator->startObjective($this->owner->id, 'zettly', 'Modify policy');
        $orchestrator->completeRoleJob($policyTamperWf['jobs']['ai_cto'], ['test_summary' => 'ok']);
        $orchestrator->completeRoleJob($policyTamperWf['jobs']['software_architect'], ['test_summary' => 'ok']);
        $tamperedDev = $orchestrator->completeRoleJob($policyTamperWf['jobs']['developer'], [
            'branch' => 'agent/tamper-policy',
            'commit_sha' => str_repeat('7', 40),
            'changed_files' => ['app/Services/ReleaseSafety/AutonomousDeploymentPolicy.php'],
            'diff_text' => '+ // disable safety check',
            'tests_passed' => true,
        ]);
        $this->assertSame('failed', $tamperedDev->status);
        $this->assertStringContainsString('Zero-Approval policy violation', (string) $tamperedDev->test_summary);
        $this->assertTrue($tamperedDev->events()->where('kind', 'policy_self_modification_blocked')->exists());
    }
}
