<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class TodoPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_todos_index_is_paginated_for_tasks(): void
    {
        /** @var User $user */ $user = User::factory()->createOne();
        $this->assertInstanceOf(User::class, $user);

        Todo::factory()->count(50)->asTask()->for($user)->create();

        $response = $this->actingAs($user)->get(route('todos.index'));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Todos/Index')
            ->where('todos.current_page', 1)
            ->has('todos.data', 20)
            ->where('todos.next_page_url', function ($value) {
                $this->assertNotNull($value);

                return true;
            })
        );
    }

    public function test_todos_index_is_paginated_for_notes(): void
    {
        /** @var User $user */ $user = User::factory()->createOne();
        $this->assertInstanceOf(User::class, $user);

        Todo::factory()->count(50)->asNote()->for($user)->create();

        $response = $this->actingAs($user)->get(route('todos.index', ['type' => 'note']));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Todos/Index')
            ->where('selectedType', 'note')
            ->where('todos.current_page', 1)
            ->has('todos.data', 20)
            ->where('todos.next_page_url', function ($value) {
                $this->assertNotNull($value);

                return true;
            })
        );
    }

    public function test_todos_index_second_page_fetches_next_results(): void
    {
        /** @var User $user */ $user = User::factory()->createOne();
        $this->assertInstanceOf(User::class, $user);

        Todo::factory()->count(50)->asNote()->for($user)->create();

        $response = $this->actingAs($user)->get(route('todos.index', ['type' => 'note', 'page' => 2]));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Todos/Index')
            ->where('selectedType', 'note')
            ->where('todos.current_page', 2)
            ->has('todos.data', 20)
            ->where('todos.prev_page_url', function ($value) {
                $this->assertNotNull($value);

                return true;
            })
        );
    }
}
