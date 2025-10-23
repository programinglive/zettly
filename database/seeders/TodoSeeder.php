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

        // Ensure we have a shared set of tags for demonstration
        $defaultTags = collect([
            ['name' => 'Work', 'color' => '#6366F1'],
            ['name' => 'Personal', 'color' => '#10B981'],
            ['name' => 'Important', 'color' => '#F97316'],
            ['name' => 'Learning', 'color' => '#0EA5E9'],
        ])->map(function ($attributes) use ($users) {
            return Tag::firstOrCreate(
                ['name' => $attributes['name'], 'user_id' => $users->first()->id],
                ['color' => $attributes['color']]
            );
        });

        // Create todos for each user with tag associations
        $users->each(function ($user) use ($defaultTags) {
            $tags = $defaultTags->map(function ($tag) use ($user) {
                return Tag::firstOrCreate(
                    ['name' => $tag->name, 'user_id' => $user->id],
                    ['color' => $tag->color]
                );
            });

            $tagIds = $tags->pluck('id');

            $quadrants = [
                ['title' => 'Handle critical production issue', 'priority' => 'urgent', 'importance' => 'important'],
                ['title' => 'Plan upcoming sprint goals', 'priority' => 'not_urgent', 'importance' => 'important'],
                ['title' => 'Answer support inbox', 'priority' => 'urgent', 'importance' => 'not_important'],
                ['title' => 'Declutter workspace', 'priority' => 'not_urgent', 'importance' => 'not_important'],
            ];

            collect($quadrants)->each(function ($attributes) use ($user, $tagIds) {
                $todo = Todo::factory()
                    ->asTask()
                    ->for($user)
                    ->create([
                        'title' => $attributes['title'],
                        'priority' => $attributes['priority'],
                        'importance' => $attributes['importance'],
                        'is_completed' => false,
                        'completed_at' => null,
                    ]);

                if ($tagIds->isNotEmpty()) {
                    $limit = min(3, $tagIds->count());
                    $todo->tags()->sync(
                        $tagIds->shuffle()->take(fake()->numberBetween(1, $limit))->all()
                    );
                }
            });

            // Additional random todos for variety
            Todo::factory()
                ->count(fake()->numberBetween(2, 4))
                ->asTask()
                ->for($user)
                ->create()
                ->each(function (Todo $todo) use ($tagIds) {
                    if ($tagIds->isEmpty()) {
                        return;
                    }

                    if ($todo->is_completed) {
                        $todo->forceFill([
                            'priority' => null,
                            'importance' => null,
                        ])->save();
                    }

                    $limit = min(3, $tagIds->count());
                    $todo->tags()->sync(
                        $tagIds->shuffle()->take(fake()->numberBetween(1, $limit))->all()
                    );
                });
        });

        // Create some additional todos with specific scenarios
        $firstUser = $users->first();
        $firstUserTagIds = Tag::where('user_id', $firstUser->id)->pluck('id');

        // Create some completed todos
        Todo::factory()
            ->count(2)
            ->asTask()
            ->for($firstUser)
            ->create([
                'is_completed' => true,
                'completed_at' => now()->subDays(rand(1, 7)),
                'priority' => null,
                'importance' => null,
            ])
            ->each(function (Todo $todo) use ($firstUserTagIds) {
                if ($firstUserTagIds->isNotEmpty()) {
                    $limit = min(3, $firstUserTagIds->count());
                    $todo->tags()->sync(
                        $firstUserTagIds->shuffle()->take(fake()->numberBetween(1, $limit))->all()
                    );
                }
            });

        // Create some pending todos covering quadrants
        Todo::factory()
            ->count(4)
            ->asTask()
            ->for($firstUser)
            ->create([
                'is_completed' => false,
                'completed_at' => null,
            ])
            ->each(function (Todo $todo) use ($firstUserTagIds) {
                $todo->update([
                    'priority' => fake()->randomElement(['urgent', 'not_urgent']),
                    'importance' => fake()->randomElement(['important', 'not_important']),
                ]);

                if ($firstUserTagIds->isNotEmpty()) {
                    $limit = min(3, $firstUserTagIds->count());
                    $todo->tags()->sync(
                        $firstUserTagIds->shuffle()->take(fake()->numberBetween(1, $limit))->all()
                    );
                }
            });

        // Create extra notes for lazy-load demo (ensure multiple pages of results)
        Todo::factory()
            ->count(50)
            ->asNote()
            ->for($firstUser)
            ->create();

        // Create many todos as well to mirror notes behavior
        Todo::factory()
            ->count(50)
            ->asTask()
            ->for($firstUser)
            ->create()
            ->each(function (Todo $todo) use ($firstUserTagIds) {
                if ($todo->is_completed) {
                    $todo->forceFill([
                        'priority' => null,
                        'importance' => null,
                    ])->save();
                }

                if ($firstUserTagIds->isNotEmpty()) {
                    $limit = min(3, $firstUserTagIds->count());
                    $todo->tags()->sync(
                        $firstUserTagIds->shuffle()->take(fake()->numberBetween(1, $limit))->all()
                    );
                }
            });
    }
}
