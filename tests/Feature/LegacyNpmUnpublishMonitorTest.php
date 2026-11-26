<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoStatusEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Todo #1100: npm Support ticket #5040981 must be checked automatically and
 * every check must leave visible feedback on the Todo until the legacy
 * package returns HTTP 404.
 */
class LegacyNpmUnpublishMonitorTest extends TestCase
{
    use RefreshDatabase;

    private const LEGACY_URL = 'https://registry.npmjs.org/@programinglive%2Fdev-workflow-mcp-server';

    private const CANONICAL_URL = 'https://registry.npmjs.org/@programinglive/dev-workflow/latest';

    private function makeTodo(): Todo
    {
        $user = User::factory()->create();

        return Todo::create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'title' => '[npm Support #5040981] Permanently remove legacy npm package',
            'description' => 'Status: PENDING npm SUPPORT.',
            'is_completed' => false,
        ]);
    }

    public function test_still_published_package_records_waiting_feedback_and_keeps_todo_open(): void
    {
        $todo = $this->makeTodo();

        Http::fake([
            self::LEGACY_URL => Http::response(['name' => '@programinglive/dev-workflow-mcp-server', 'dist-tags' => ['latest' => '1.32.8']], 200),
            self::CANONICAL_URL => Http::response(['name' => '@programinglive/dev-workflow', 'version' => '3.1.4'], 200),
        ]);

        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])
            ->expectsOutputToContain('status=waiting')
            ->assertExitCode(0);

        $todo->refresh();
        $this->assertFalse((bool) $todo->is_completed);
        $this->assertStringContainsString('Belum ada balasan dari pihak npmjs', $todo->description);
        $this->assertStringContainsString('Status: PENDING npm SUPPORT.', $todo->description, 'Original description must be preserved.');

        $event = TodoStatusEvent::where('todo_id', $todo->id)->latest('id')->first();
        $this->assertNotNull($event);
        $this->assertSame('pending', $event->from_state);
        $this->assertSame('pending', $event->to_state);
        $this->assertStringContainsString('Belum ada balasan dari pihak npmjs', $event->reason);
        $this->assertStringContainsString('HTTP 200', $event->reason);
        $this->assertStringContainsString('3.1.4', $event->reason);
    }

    public function test_repeated_checks_keep_a_single_rolling_log_block(): void
    {
        $todo = $this->makeTodo();

        Http::fake([
            self::LEGACY_URL => Http::response(['name' => 'legacy'], 200),
            self::CANONICAL_URL => Http::response(['version' => '3.1.4'], 200),
        ]);

        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])->assertExitCode(0);
        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])->assertExitCode(0);

        $todo->refresh();
        $this->assertSame(1, substr_count($todo->description, '## Riwayat Pengecekan Otomatis npm'));
        $this->assertSame(2, TodoStatusEvent::where('todo_id', $todo->id)->count());
    }

    public function test_unpublished_package_with_healthy_canonical_completes_the_todo(): void
    {
        $todo = $this->makeTodo();

        Http::fake([
            self::LEGACY_URL => Http::response(['error' => 'Not found'], 404),
            self::CANONICAL_URL => Http::response(['version' => '3.1.4'], 200),
        ]);

        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])
            ->expectsOutputToContain('status=unpublished')
            ->assertExitCode(0);

        $todo->refresh();
        $this->assertTrue((bool) $todo->is_completed);
        $this->assertNotNull($todo->completed_at);

        $event = TodoStatusEvent::where('todo_id', $todo->id)->latest('id')->first();
        $this->assertSame('pending', $event->from_state);
        $this->assertSame('completed', $event->to_state);
        $this->assertStringContainsString('HTTP 404', $event->reason);
    }

    public function test_unpublished_legacy_with_unhealthy_canonical_stays_open(): void
    {
        $todo = $this->makeTodo();

        Http::fake([
            self::LEGACY_URL => Http::response([], 404),
            self::CANONICAL_URL => Http::response([], 500),
        ]);

        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])
            ->expectsOutputToContain('status=canonical_unhealthy')
            ->assertExitCode(0);

        $this->assertFalse((bool) $todo->refresh()->is_completed);
    }

    public function test_completed_todo_is_skipped_without_new_feedback(): void
    {
        $todo = $this->makeTodo();
        $todo->forceFill(['is_completed' => true, 'completed_at' => now()])->save();

        Http::fake();

        $this->artisan('zettly:verify-legacy-npm', ['--todo' => $todo->id])
            ->expectsOutputToContain('status=already_completed')
            ->assertExitCode(0);

        Http::assertNothingSent();
        $this->assertSame(0, TodoStatusEvent::where('todo_id', $todo->id)->count());
    }

    public function test_command_is_scheduled_every_six_hours(): void
    {
        $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
            ->filter(fn ($event) => str_contains((string) $event->command, 'zettly:verify-legacy-npm'));

        $this->assertCount(1, $events);
        $this->assertSame('0 */6 * * *', $events->first()->expression);
    }
}
