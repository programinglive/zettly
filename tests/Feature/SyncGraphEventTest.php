<?php

namespace Tests\Feature;

use App\Jobs\SyncGraphEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncGraphEventTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Point at a host the base TestCase has not stubbed, so these assertions
        // are not answered by the catch-all localhost fake.
        config(['services.graph.url' => 'http://graph.test']);
    }

    public function test_it_posts_the_event_to_the_graph_service(): void
    {
        Http::fake(['http://graph.test/sync' => Http::response(['success' => true])]);

        (new SyncGraphEvent('node:add', ['id' => '7', 'title' => 'Write the report']))->handle();

        Http::assertSent(function ($request) {
            return $request->url() === 'http://graph.test/sync'
                && $request['type'] === 'node:add'
                && $request['data']['id'] === '7';
        });
    }

    public function test_a_non_success_response_fails_the_job_so_the_queue_retries(): void
    {
        // Swallowing this would drop the event silently; throwing lets the queue
        // retry and then record it in failed_jobs.
        Http::fake(['http://graph.test/sync' => Http::response('nope', 503)]);

        $this->expectException(\RuntimeException::class);

        (new SyncGraphEvent('node:update', ['id' => '7']))->handle();
    }
}