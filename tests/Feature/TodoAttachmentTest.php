<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TodoAttachmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['todo.attachments_disk' => 'public']);
        Storage::fake(config('todo.attachments_disk'));
    }

    public function test_user_can_upload_attachment_to_their_todo(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->image('test-image.jpg', 800, 600);

        $payload = [
            'file' => $file,
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/attachments", array_merge($payload, ['_token' => 'test-token']));

        $response->assertRedirect();

        $this->assertDatabaseHas('todo_attachments', [
            'todo_id' => $todo->id,
            'original_name' => 'test-image.jpg',
            'mime_type' => 'image/jpeg',
            'type' => 'image',
        ]);

        $attachment = TodoAttachment::where('todo_id', $todo->id)->first();
        $this->assertTrue(Storage::disk(config('todo.attachments_disk'))->exists($attachment->file_path));
    }

    public function test_user_can_upload_attachment_when_using_gcs_disk(): void
    {
        config(['todo.attachments_disk' => 'gcs']);
        Storage::fake('gcs');

        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->image('gcs-image.jpg', 800, 600);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/attachments", [
                'file' => $file,
                '_token' => 'test-token',
            ]);

        $response->assertRedirect();

        $attachment = TodoAttachment::where('todo_id', $todo->id)->firstOrFail();
        $this->assertTrue(Storage::disk('gcs')->exists($attachment->file_path));

        // Restore default disk for subsequent tests
        config(['todo.attachments_disk' => 'public']);
        Storage::fake('public');
    }

    public function test_user_cannot_upload_attachment_to_others_todo(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var User $otherUser */
        $otherUser = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $otherUser->id]);

        $file = UploadedFile::fake()->image('test-image.jpg');

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/attachments", [
                'file' => $file,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_can_delete_their_attachment(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);
        $attachment = TodoAttachment::factory()->create(['todo_id' => $todo->id]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['X-CSRF-TOKEN' => 'test-token'])
            ->delete("/attachments/{$attachment->id}", ['_token' => 'test-token']);

        $response->assertOk();
        $this->assertDatabaseMissing('todo_attachments', ['id' => $attachment->id]);
    }

    public function test_user_cannot_delete_others_attachment(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var User $otherUser */
        $otherUser = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $otherUser->id]);
        $attachment = TodoAttachment::factory()->create(['todo_id' => $todo->id]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['X-CSRF-TOKEN' => 'test-token'])
            ->delete("/attachments/{$attachment->id}", ['_token' => 'test-token']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('todo_attachments', ['id' => $attachment->id]);
    }

    public function test_delete_attachment_returns_json_message(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);
        $attachment = TodoAttachment::factory()->create(['todo_id' => $todo->id]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['X-CSRF-TOKEN' => 'test-token'])
            ->deleteJson("/attachments/{$attachment->id}", ['_token' => 'test-token']);

        $response->assertOk();
        $response->assertJson(['message' => 'Attachment deleted successfully']);
        $this->assertDatabaseMissing('todo_attachments', ['id' => $attachment->id]);
    }

    public function test_user_can_download_their_attachment(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        // Create a fake file in storage
        $filePath = 'todos/1/attachments/test-file.txt';
        Storage::disk(config('todo.attachments_disk'))->put($filePath, 'Test file content');

        $attachment = TodoAttachment::factory()->create([
            'todo_id' => $todo->id,
            'file_path' => $filePath,
            'original_name' => 'test-file.txt',
        ]);

        $response = $this->actingAs($user)
            ->get("/attachments/{$attachment->id}/download");

        $response->assertOk();
        $response->assertHeader('content-disposition', 'attachment; filename=test-file.txt');
    }

    public function test_attachment_type_is_determined_correctly(): void
    {
        $this->assertEquals('image', TodoAttachment::determineType('image/jpeg'));
        $this->assertEquals('image', TodoAttachment::determineType('image/png'));
        $this->assertEquals('document', TodoAttachment::determineType('application/pdf'));
        $this->assertEquals('document', TodoAttachment::determineType('text/plain'));
        $this->assertEquals('other', TodoAttachment::determineType('application/zip'));
    }

    public function test_todo_show_includes_attachments(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);
        $attachment = TodoAttachment::factory()->create(['todo_id' => $todo->id]);

        $response = $this->actingAs($user)
            ->get("/todos/{$todo->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('todo.attachments.0')
            ->where('todo.attachments.0.id', $attachment->id)
        );
    }
}
