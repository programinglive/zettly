<?php

namespace Database\Seeders;

use App\Models\Focus;
use App\Models\FocusStatusEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class FocusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            $users = User::factory(3)->create();
        }

        $users->each(function (User $user, int $index) {
            $this->seedActiveFocus($user, $index);
            $this->seedCompletedFoci($user, $index);
        });
    }

    protected function seedActiveFocus(User $user, int $index): void
    {
        $titles = [
            'Ship the next milestone',
            'Prepare customer feedback summary',
            'Unblock the onboarding checklist',
        ];

        $title = $titles[$index % count($titles)];

        $startedAt = Carbon::now()->subHours(2 + $index);

        Focus::updateOrCreate(
            [
                'user_id' => $user->id,
                'title' => $title,
            ],
            [
                'description' => 'Active focus seeded for demo purposes to highlight the FocusGreeting card.',
                'started_at' => $startedAt,
                'completed_at' => null,
            ]
        );
    }

    protected function seedCompletedFoci(User $user, int $index): void
    {
        $history = [
            [
                'title' => 'Wrap up weekly planning',
                'description' => 'Finalize backlog grooming notes and share with the squad.',
                'reason' => 'Aligned on the next sprint priorities with the team.',
                'days_ago' => 1 + $index,
            ],
            [
                'title' => 'Respond to customer interviews',
                'description' => 'Synthesize interview notes into actionable insights.',
                'reason' => 'Captured three key themes to guide roadmap decisions.',
                'days_ago' => 2 + $index,
            ],
        ];

        foreach ($history as $item) {
            $startedAt = Carbon::now()->subDays($item['days_ago'])->startOfDay()->addHours(9);
            $completedAt = (clone $startedAt)->addHours(2);

            $focus = Focus::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'title' => $item['title'],
                ],
                [
                    'description' => $item['description'],
                    'started_at' => $startedAt,
                    'completed_at' => $completedAt,
                ]
            );

            FocusStatusEvent::updateOrCreate(
                [
                    'focus_id' => $focus->id,
                    'user_id' => $user->id,
                    'action' => 'completed',
                    'reason' => $item['reason'],
                ],
                [
                    'created_at' => $completedAt,
                    'updated_at' => $completedAt,
                ]
            );
        }
    }
}
