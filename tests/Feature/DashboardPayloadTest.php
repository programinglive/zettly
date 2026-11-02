<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardPayloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_dashboard_does_not_ship_the_todo_list(): void
    {
        // Dashboard.jsx destructures `todos` and never reads it, so the whole
        // non-archived task list was loaded, hydrated (tags, both link directions,
        // attachments) and serialized for nothing.
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->count(80)->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->missing('todos')
                ->etc()
            );
    }

    public function test_the_dashboard_payload_does_not_grow_with_the_number_of_todos(): void
    {
        // Measured on the props, not the whole HTML: the shell is ~47 KB and hides
        // the difference. The `todos` prop alone was 1,021 bytes for 2 todos and
        // 12,499 for 22 - about 570 bytes per todo, all of it unused.
        $user = User::factory()->create();

        Todo::factory()->for($user)->asTask()->count(2)->create();
        $small = $this->propsSize($user);

        Todo::factory()->for($user)->asTask()->count(20)->create();
        $large = $this->propsSize($user);

        $this->assertLessThan(
            500,
            $large - $small,
            '20 extra todos added '.($large - $small).' bytes of props; the list is still being shipped.'
        );
    }

    private function propsSize(User $user): int
    {
        $response = $this->actingAs($user)->get('/dashboard')->assertOk();
        $page = $response->viewData('page') ?? [];

        return strlen(json_encode($page['props'] ?? []));
    }
}