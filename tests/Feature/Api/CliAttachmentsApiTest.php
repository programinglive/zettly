<?php

namespace Tests\Feature\Api;

use App\Models\Todo;
use App\Models\TodoAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CliAttachmentsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_attachment_metadata_does_not_initialize_cloud_storage(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $attachment = TodoAttachment::factory()->create([
            'todo_id' => $todo->id,
            'file_path' => 'private/report.pdf',
            'thumbnail_path' => null,
        ]);
        Sanctum::actingAs($user, ['zettly:cli']);
        Storage::shouldReceive('disk')->never();

        $this->getJson('/api/v1/attachments')
            ->assertOk()
            ->assertJsonPath('data.0.id', $attachment->id)
            ->assertJsonMissingPath('data.0.url')
            ->assertJsonMissingPath('data.0.thumbnail_url');

        $this->getJson('/api/v1/attachments/'.$attachment->id)
            ->assertOk()
            ->assertJsonPath('data.id', $attachment->id)
            ->assertJsonMissingPath('data.url')
            ->assertJsonMissingPath('data.thumbnail_url');
    }
}
