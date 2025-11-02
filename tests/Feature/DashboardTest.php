<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_attachments_for_selected_todos(): void
    {
        Storage::fake('public');

        /** @var User $user */
        $user = User::factory()->create();

        /** @var Todo $todo */
        $todo = Todo::factory()
            ->for($user)
            ->asTask()
            ->create();

        $attachment = TodoAttachment::factory()
            ->for($todo)
            ->create([
                'original_name' => 'mock.pdf',
                'file_path' => 'todos/'.$todo->id.'/attachments/mock.pdf',
                'type' => 'document',
                'file_size' => 2048,
            ]);

        Storage::disk('public')->put($attachment->file_path, 'fake-content');

        $response = $this
            ->actingAs($user)
            ->get('/dashboard');

        $response
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('todos', 1, fn ($todoPage) => $todoPage
                    ->where('id', $todo->id)
                    ->has('attachments', 1, fn ($attachmentPage) => $attachmentPage
                        ->where('original_name', 'mock.pdf')
                        ->has('url')
                        ->has('thumbnail_url')
                        ->etc()
                    )
                    ->etc()
                )
            );
    }
}
