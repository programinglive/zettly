<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DispatchReportGeneration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The queue worker resolves job dependencies through the container, not by
 * passing arguments by hand.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `DispatchReportGeneration::handle()` takes an injectable
 * `?Carbon\CarbonInterface $now = null` so the nightly report is deterministic
 * in tests. Every existing test calls `handle($generator, $delivery)` directly,
 * so none of them ever went through the container.
 *
 * Laravel's container treats a class-typed parameter as a dependency even when
 * it has a default, unless the parameter is optional or has a scalar default.
 * With an interface type it cannot instantiate, so a real queued run failed
 * with:
 *
 *   BindingResolutionException: Target [Carbon\CarbonInterface] is not
 *   instantiable while building [WorkCommand, DispatchReportGeneration]
 *
 * That exception reached Sentry as TODOAPP-6F and no report was ever generated
 * by the scheduler. Calling `handle` directly can never catch it, which is why
 * this test drives the same path the worker uses.
 */
class DispatchReportGenerationResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_container_can_resolve_the_job_handler(): void
    {
        $user = User::factory()->create();
        $job = new DispatchReportGeneration($user->id, deliver: false);

        // This is how Illuminate\Queue\CallQueuedHandler invokes a job: the
        // container builds the method arguments. A type-hint it cannot resolve
        // throws here instead of inside a queue worker at 23:55.
        app()->call([$job, 'handle']);

        $this->assertTrue(true, 'The container resolved every handle() argument.');
    }
}
