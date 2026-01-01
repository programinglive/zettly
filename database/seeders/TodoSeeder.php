<?php

namespace Database\Seeders;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\Seeder;

class TodoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all existing users
        $users = User::all();

        if ($users->isEmpty()) {
            // If no users exist, create some first
            $users = User::factory(3)->create();
        }

        // Create a single representative todo for the first user
        $firstUser = $users->first();

        // Create default tags
        $tags = collect([
            ['name' => 'Work', 'color' => '#6366F1'],
            ['name' => 'Personal', 'color' => '#10B981'],
        ])->map(function ($attributes) use ($firstUser) {
            return Tag::firstOrCreate(
                ['name' => $attributes['name'], 'user_id' => $firstUser->id],
                ['color' => $attributes['color']]
            );
        });

        // Create one representative todo
        $todo = Todo::factory()
            ->asTask()
            ->for($firstUser)
            ->create([
                'title' => 'Sample task for testing',
                'priority' => 'urgent',
                'importance' => 'important',
                'is_completed' => false,
                'completed_at' => null,
            ]);

        // Attach tags to the todo
        if ($tags->isNotEmpty()) {
            $todo->tags()->sync($tags->pluck('id')->all());
        }
    }
}
