<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TodoBoardAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_board_serializes_attachment_urls(): void
    {
        // Moved here from DashboardTest: the dashboard no longer ships a todo list
        // (nothing rendered it), and the board is where attachments are displayed.
        Storage::fake('public');

        $user = User::factory()->create();
        $todo = Todo::factory()->for($user)->asTask()->create();

        $attachment = TodoAttachment::factory()->for($todo)->create([
            'original_name' => 'mock.pdf',
            'file_path' => 'todos/'.$todo->id.'/attachments/mock.pdf',
            'type' => 'document',
            'file_size' => 2048,
        ]);

        Storage::disk('public')->put($attachment->file_path, 'fake-content');

        $this->actingAs($user)
            ->get('/todos/board')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Todos/Board')
                ->has('todos', 1, fn (Assert $todoPage) => $todoPage
                    ->where('id', $todo->id)
                    ->has('attachments', 1, fn (Assert $attachmentPage) => $attachmentPage
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