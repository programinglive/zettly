<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DrawGalleryTest extends TestCase
{
    use RefreshDatabase;

    public function test_gallery_shows_single_create_button(): void
    {
        $filePath = resource_path('js/Pages/Draw/Index.jsx');
        $this->assertFileExists($filePath, 'Draw index component should exist.');

        $content = file_get_contents($filePath);
        $this->assertNotFalse($content, 'Failed to read Draw/Index.jsx contents.');

        $newDrawingButtonCount = substr_count($content, 'onClick={handleCreateDrawing}');
        $createDrawingCount = substr_count($content, 'Create drawing');

        $this->assertGreaterThanOrEqual(1, $newDrawingButtonCount, 'handleCreateDrawing should be wired to at least one button in the gallery view.');
        $this->assertSame(0, $createDrawingCount, 'Empty state should no longer render a separate "Create drawing" button.');
    }

    public function test_gallery_create_post_creates_drawing(): void
    {
        $user = User::factory()->create();

        $payload = [
            'title' => 'Quick sketch',
            'document' => ['store' => ['shape:abc' => ['type' => 'draw']]],
        ];

        $response = $this->actingAs($user)->postJson(route('draw.store'), $payload);

        $response->assertCreated()->assertJsonPath('drawing.title', $payload['title']);

        $this->assertDatabaseHas('drawings', [
            'user_id' => $user->id,
            'title' => $payload['title'],
        ]);
    }
}
