<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DrawTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_page_lists_user_drawings(): void
    {
        $user = User::factory()->create();
        $drawings = Drawing::factory()
            ->count(2)
            ->for($user)
            ->sequence(
                ['title' => 'First sketch'],
                ['title' => 'Second sketch']
            )
            ->create();

        $response = $this
            ->actingAs($user)
            ->get(route('draw.index'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Draw/Index')
                ->has('drawings', 2)
                ->where('drawings.0.title', $drawings[0]->title)
                ->where('drawings.1.title', $drawings[1]->title));
    }

    public function test_create_route_renders_page_without_conflict(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('draw.create'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Draw/Index'));
    }

    public function test_user_can_load_individual_drawing(): void
    {
        $user = User::factory()->create();
        $drawing = Drawing::factory()->for($user)->create();

        $response = $this->actingAs($user)->get(route('draw.show', $drawing));

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'drawing' => [
                    'id' => $drawing->id,
                    'title' => $drawing->title,
                ],
            ]);
    }

    public function test_user_can_create_drawing(): void
    {
        $user = User::factory()->create();
        $payload = [
            'title' => 'Concept Map',
            'document' => ['store' => ['shape' => []]],
        ];

        $response = $this
            ->actingAs($user)
            ->postJson(route('draw.store'), $payload);

        $response
            ->assertCreated()
            ->assertJsonPath('drawing.title', $payload['title']);

        $this->assertDatabaseHas('drawings', [
            'user_id' => $user->id,
            'title' => $payload['title'],
        ]);
    }

    public function test_user_can_update_existing_drawing(): void
    {
        $user = User::factory()->create();
        $drawing = Drawing::factory()->for($user)->create([
            'title' => 'Initial title',
            'document' => ['store' => ['shape' => []]],
        ]);

        $payload = [
            'title' => 'Updated title',
            'document' => ['store' => ['shape' => ['a' => ['type' => 'draw']]]],
        ];

        $response = $this
            ->actingAs($user)
            ->patchJson(route('draw.update', $drawing), $payload);

        $response
            ->assertOk()
            ->assertJsonPath('drawing.title', $payload['title']);

        $this->assertDatabaseHas('drawings', [
            'id' => $drawing->id,
            'title' => $payload['title'],
        ]);
    }

    public function test_user_cannot_access_another_users_drawing(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $drawing = Drawing::factory()->for($other)->create();

        $this->actingAs($user)
            ->get(route('draw.show', $drawing))
            ->assertForbidden();
    }
}
