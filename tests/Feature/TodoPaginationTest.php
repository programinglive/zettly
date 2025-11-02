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

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_todo_index_paginates_results(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Todo::factory()->asTask()->count(25)->create([
            'user_id' => $user->id,
        ]);

        $pageOneResponse = $this->actingAs($user)->get(route('todos.index'));

        $pageOneResponse->assertStatus(200);
        $pageOneResponse->assertInertia(function (AssertableInertia $page) {
            $page->component('Todos/Index')
                ->has('todos.data', 20)
                ->where('todos.total', 25)
                ->where('todos.per_page', 20)
                ->where('todos.current_page', 1);
        });

        $pageTwoResponse = $this->actingAs($user)->get(route('todos.index', ['page' => 2]));

        $pageTwoResponse->assertStatus(200);
        $pageTwoResponse->assertInertia(function (AssertableInertia $page) {
            $page->component('Todos/Index')
                ->has('todos.data', 5)
                ->where('todos.total', 25)
                ->where('todos.per_page', 20)
                ->where('todos.current_page', 2);
        });
    }
}
