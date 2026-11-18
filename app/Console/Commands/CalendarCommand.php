<?php

namespace App\Console\Commands;

use App\Domain\Priority\WeeklyFocusAllocationService;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class CalendarCommand extends Command
{
    protected $signature = 'zettly:calendar
        {--user= : User ID or email (defaults to first user)}
        {--date= : Target YYYY-MM-DD date (defaults to today)}
        {--set-day= : Optional day of week (monday..sunday) to update}
        {--theme= : Theme title when --set-day is used}
        {--tags= : Comma-separated tags when --set-day is used}
        {--color= : Hex color (#RRGGBB) when --set-day is used}
        {--description= : Optional description when --set-day is used}
        {--json : Output as JSON}';

    protected $description = 'Inspect or configure the Zettly Calendar and Weekly Focus Allocation schedule';

    public function handle(WeeklyFocusAllocationService $service): int
    {
        $userOption = $this->option('user');
        $user = $userOption !== null
            ? (is_numeric($userOption)
                ? User::query()->find((int) $userOption)
                : User::query()->where('email', (string) $userOption)->first())
            : User::query()->orderBy('id')->first();

        if (! $user) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $setDay = $this->option('set-day');
        if (is_string($setDay) && trim($setDay) !== '') {
            $dayKey = strtolower(trim($setDay));
            if (! in_array($dayKey, WeeklyFocusAllocationService::DAYS, true)) {
                $this->error("Invalid --set-day '{$setDay}'. Expected one of: " . implode(', ', WeeklyFocusAllocationService::DAYS));

                return self::FAILURE;
            }

            $update = [];
            if ($this->option('theme') !== null) {
                $update['theme'] = (string) $this->option('theme');
            }
            if ($this->option('tags') !== null) {
                $update['tags'] = array_values(array_filter(array_map('trim', explode(',', (string) $this->option('tags')))));
            }
            if ($this->option('color') !== null) {
                $update['color'] = (string) $this->option('color');
            }
            if ($this->option('description') !== null) {
                $update['description'] = (string) $this->option('description');
            }

            $service->updateSchedule($user->id, [$dayKey => $update], 'cli');
        }

        $dateStr = (string) ($this->option('date') ?: now()->format('Y-m-d'));
        $activeDate = CarbonImmutable::parse($dateStr);
        $schedule = $service->getSchedule($user->id);
        $calendar = $service->buildCalendar($user->id, $activeDate, $activeDate);

        $payload = [
            'user_id' => $user->id,
            'date' => $activeDate->format('Y-m-d'),
            'schedule' => $schedule,
            'active_day' => $calendar['active_day'],
        ];

        if ($this->option('json')) {
            $this->line((string) json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->info("Zettly Weekly Focus Allocation — {$user->email} ({$activeDate->format('Y-m-d')})");
        $this->table(
            ['Day', 'Theme', 'Tags', 'Description'],
            array_map(static fn (array $row): array => [
                $row['label'],
                $row['theme'],
                implode(', ', $row['tags']),
                $row['description'],
            ], array_values($schedule))
        );

        return self::SUCCESS;
    }
}
