<?php

namespace Tests\Feature\CodingAgent;

use App\Models\CodingAgentJob;
use App\Models\EngineeringImprovement;
use App\Models\EngineeringLesson;
use App\Models\User;
use App\Services\EngineeringIntelligence\AutonomousDispatchGuardService;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class V19EffectivenessAndAutonomousDispatchTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'coding_agent.enabled' => true,
            'coding_agent.owner_email' => 'mahatma.mahardhika@programinglive.com',
            'coding_agent.max_concurrent_jobs' => 2,
        ]);

        $this->owner = User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
            'email_verified_at' => now(),
        ]);
        config(['coding_agent.owner_user_id' => $this->owner->id]);
    }

    public function test_effectiveness_measurement_loop_classifies_inconclusive_effective_and_ineffective_and_records_lessons(): void
    {
        $intelligence = app(EngineeringIntelligenceService::class);

        $imp = EngineeringImprovement::create([
            'user_id' => $this->owner->id,
            'fingerprint' => hash('sha256', 'v19-eff-1'),
            'action_code' => 'IMP-V19EFF',
            'title' => 'Recurring staging timeout in QA suite',
            'description' => 'Observed 3 timeouts',
            'owner_role' => 'qa_engineer',
            'priority' => 'P0',
            'status' => 'MEASURING',
            'occurrence_count' => 3,
            'verification_criteria' => 'Zero timeouts across 5 consecutive runs.',
        ]);

        // 1. Insufficient sample size -> INCONCLUSIVE (never forces conclusion)
        $inconclusive = $intelligence->measureImprovementEffectiveness($imp, [
            'baseline_occurrences' => 3,
            'post_change_occurrences' => 0,
            'sample_size' => 1,
            'min_sample_size' => 3,
        ]);
        $this->assertSame('INCONCLUSIVE', $inconclusive['verdict']);
        $this->assertNull($inconclusive['lesson_id']);
        $this->assertSame('INCONCLUSIVE', $imp->fresh()->status);

        // 2. Sufficient sample size with 0 recurrences -> EFFECTIVE + confirmed EngineeringLesson
        $effective = $intelligence->measureImprovementEffectiveness($imp->fresh(), [
            'baseline_occurrences' => 3,
            'post_change_occurrences' => 0,
            'sample_size' => 5,
            'min_sample_size' => 3,
        ]);
        $this->assertSame('EFFECTIVE', $effective['verdict']);
        $this->assertNotNull($effective['lesson_id']);
        $this->assertSame('EFFECTIVE', $imp->fresh()->status);
        $this->assertSame('confirmed', EngineeringLesson::find($effective['lesson_id'])->confidence);

        // 3. Persistent recurrences -> INEFFECTIVE + hypothesis lesson
        $ineffective = $intelligence->measureImprovementEffectiveness($imp->fresh(), [
            'baseline_occurrences' => 3,
            'post_change_occurrences' => 3,
            'sample_size' => 4,
            'min_sample_size' => 3,
        ]);
        $this->assertSame('INEFFECTIVE', $ineffective['verdict']);
        $this->assertSame('INEFFECTIVE', $imp->fresh()->status);
    }

    public function test_guarded_autonomous_dispatch_shadow_mode_safety_blocks_and_canary_dispatch(): void
    {
        $guard = app(AutonomousDispatchGuardService::class);

        $imp = EngineeringImprovement::create([
            'user_id' => $this->owner->id,
            'fingerprint' => hash('sha256', 'v19-disp-1'),
            'action_code' => 'IMP-V19DSP',
            'title' => 'Recurring lint failure in docs script',
            'description' => 'Observed 2 failures',
            'owner_role' => 'developer',
            'priority' => 'P0',
            'status' => 'APPROVED_BY_POLICY',
            'occurrence_count' => 2,
            'verification_criteria' => 'All tests pass with zero lint errors.',
        ]);

        // 1. Default shadow mode evaluates eligible task without dispatching
        $shadow = $guard->evaluateAndDispatch($imp, 'zettly', [
            'mode' => 'shadow',
            'expected_files' => ['app/Services/ExampleService.php'],
        ]);
        $this->assertTrue($shadow['eligible']);
        $this->assertFalse($shadow['dispatched']);
        $this->assertSame('SHADOW_ELIGIBLE_NOT_DISPATCHED', $shadow['decision']);
        $this->assertFalse($shadow['permissions_auto_expanded']);

        // 2. Active safety incident or forbidden protected path blocks dispatch
        $blockedIncident = $guard->evaluateAndDispatch($imp->fresh(), 'zettly', [
            'mode' => 'canary',
            'active_safety_incident' => true,
            'expected_files' => ['app/Services/ExampleService.php'],
        ]);
        $this->assertFalse($blockedIncident['eligible']);
        $this->assertSame('BLOCKED', $blockedIncident['decision']);

        $blockedPath = $guard->evaluateAndDispatch($imp->fresh(), 'zettly', [
            'mode' => 'canary',
            'expected_files' => ['app/Services/ReleaseSafety/AutonomousDeploymentPolicy.php'],
        ]);
        $this->assertFalse($blockedPath['eligible']);
        $this->assertSame('BLOCKED', $blockedPath['decision']);

        // 3. Clean canary dispatch succeeds and creates governed workflow
        $canary = $guard->evaluateAndDispatch($imp->fresh(), 'zettly', [
            'mode' => 'canary',
            'expected_files' => ['app/Services/ExampleService.php'],
        ]);
        $this->assertTrue($canary['eligible']);
        $this->assertTrue($canary['dispatched']);
        $this->assertSame('CANARY_DISPATCHED', $canary['decision']);
        $this->assertNotNull($canary['workflow_task_id']);
        $this->assertSame('IN_PROGRESS', $imp->fresh()->status);

        // 4. Duplicate dispatch for the same active objective is blocked
        $duplicate = $guard->evaluateAndDispatch($imp->fresh(), 'zettly', [
            'mode' => 'canary',
            'expected_files' => ['app/Services/ExampleService.php'],
        ]);
        $this->assertFalse($duplicate['eligible']);
        $this->assertFalse($duplicate['dispatched']);
        $this->assertSame('BLOCKED', $duplicate['decision']);
    }
}
