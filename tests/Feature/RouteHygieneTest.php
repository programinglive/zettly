<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RouteHygieneTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_diagnostic_upload_route_is_gone(): void
    {
        // UploadTestController accepted any file from any signed-in user, wrote it
        // to the public disk with a client-controlled extension (same-origin HTML /
        // SVG), and no page linked to it.
        $user = User::factory()->create();

        $this->actingAs($user)->get('/upload')->assertNotFound();
        $this->actingAs($user)->post('/upload', [])->assertNotFound();

        $this->assertFalse(\Illuminate\Support\Facades\Route::has('upload.show'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('upload.store'));
    }

    public function test_system_status_is_operator_information_only(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/system-status')
            ->assertForbidden();
    }

    public function test_a_super_admin_can_read_system_status(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->getJson('/system-status')
            ->assertOk()
            ->assertJsonStructure(['app_version', 'laravel_version', 'environment', 'debug_mode']);
    }

    public function test_creating_a_todo_does_not_block_on_the_graph_service(): void
    {
        // The observer used to POST synchronously with a 2 s timeout, so every todo
        // write waited on a decorative service. It now dispatches a job instead.
        Queue::fake();
        $user = User::factory()->create();

        Todo::factory()->create(['user_id' => $user->id]);

        Queue::assertPushed(\App\Jobs\SyncGraphEvent::class);
        \Illuminate\Support\Facades\Http::assertNothingSent();
    }
}