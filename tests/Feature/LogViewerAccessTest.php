<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogViewerAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_access_log_viewer(): void
    {
        $user = User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
        ]);

        $this->actingAs($user)
            ->get('/log-viewer')
            ->assertStatus(200);
    }

    public function test_unauthorized_user_cannot_access_log_viewer(): void
    {
        $user = User::factory()->create([
            'email' => 'other@example.com',
        ]);

        $this->actingAs($user)
            ->get('/log-viewer')
            ->assertStatus(403);
    }
}
