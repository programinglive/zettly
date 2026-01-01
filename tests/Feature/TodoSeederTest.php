<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Database\Seeders\TodoSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_todo_seeder_creates_default_tags(): void
    {
        $this->seed(UserSeeder::class);
        $this->seed(TodoSeeder::class);

        $user = User::first();
        
        $this->assertDatabaseHas('tags', [
            'name' => 'Work',
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('tags', [
            'name' => 'Personal',
            'user_id' => $user->id,
        ]);
    }

    public function test_todo_seeder_creates_single_representative_todo(): void
    {
        $this->seed(UserSeeder::class);
        $this->seed(TodoSeeder::class);

        $firstUser = User::first();
        
        // Should have exactly one todo for the first user
        $this->assertEquals(1, $firstUser->todos()->count());
        
        $todo = $firstUser->todos()->first();
        $this->assertEquals('todo', $todo->type);
        $this->assertEquals('Sample task for testing', $todo->title);
        $this->assertEquals('urgent', $todo->priority);
        $this->assertEquals('important', $todo->importance);
        $this->assertFalse($todo->is_completed);
    }

    public function test_todo_seeder_assigns_tags_to_todo(): void
    {
        $this->seed(UserSeeder::class);
        $this->seed(TodoSeeder::class);

        $firstUser = User::first();
        $todo = $firstUser->todos()->first();
        
        // Todo should have tags attached
        $this->assertGreaterThan(0, $todo->tags()->count());
        
        // Should have both Work and Personal tags
        $this->assertTrue($todo->tags()->where('name', 'Work')->exists());
        $this->assertTrue($todo->tags()->where('name', 'Personal')->exists());
    }

    public function test_todo_seeder_performance_fast(): void
    {
        $this->seed(UserSeeder::class);
        
        $startTime = microtime(true);
        $this->seed(TodoSeeder::class);
        $endTime = microtime(true);
        
        $executionTime = $endTime - $startTime;
        
        // Should complete very quickly now (under 5 seconds)
        $this->assertLessThan(5, $executionTime, 'TodoSeeder should complete within 5 seconds');
    }
}
