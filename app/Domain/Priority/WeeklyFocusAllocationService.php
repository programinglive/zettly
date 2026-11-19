<?php

namespace App\Domain\Priority;

use App\Models\PriorityDecision;
use App\Models\Todo;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Manages per-user Day-of-Week Focus Allocation rules and builds the
 * structured Calendar month/week schedule with theme matching and P0 override.
 */
final class WeeklyFocusAllocationService
{
    /**
     * Ordered canonical days of the week (ISO-8601 Monday..Sunday).
     *
     * @var array<int, string>
     */
    public const DAYS = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
    ];

    /**
     * Return the default 7-day focus allocation schedule.
     *
     * @return array<string, array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}>
     */
    public function defaultSchedule(): array
    {
        $weekday = [
            'theme' => 'Beautyworld & Clinic',
            'tags' => ['proyek:clinic', 'proyek:erp', 'area:beautyworld'],
            'color' => '#2563EB',
            'description' => 'Focus on Beautyworld & Clinic operations and features',
        ];

        return [
            'monday' => ['day' => 'monday', 'label' => 'Monday', ...$weekday],
            'tuesday' => ['day' => 'tuesday', 'label' => 'Tuesday', ...$weekday],
            'wednesday' => ['day' => 'wednesday', 'label' => 'Wednesday', ...$weekday],
            'thursday' => ['day' => 'thursday', 'label' => 'Thursday', ...$weekday],
            'friday' => ['day' => 'friday', 'label' => 'Friday', ...$weekday],
            'saturday' => [
                'day' => 'saturday',
                'label' => 'Saturday',
                'theme' => 'ProgramingLive',
                'tags' => ['area:zettly', 'proyek:dbpinball', 'area:programinglive'],
                'color' => '#F97316',
                'description' => 'Dedicated focus on ProgramingLive products & open-source',
            ],
            'sunday' => [
                'day' => 'sunday',
                'label' => 'Sunday',
                'theme' => 'Development Tools',
                'tags' => ['proyek:devworkflow-capture-studio', 'area:cli', 'area:monitor'],
                'color' => '#10B981',
                'description' => 'Improve developer tooling, MCP servers, and automation',
            ],
        ];
    }

    /**
     * Load the user's current 7-day focus allocation schedule.
     *
     * @return array<string, array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}>
     */
    public function getSchedule(int $userId): array
    {
        $defaults = $this->defaultSchedule();

        $latest = PriorityDecision::query()
            ->where('user_id', $userId)
            ->where('action', PriorityDecision::ACTION_WEEKLY_FOCUS)
            ->latest('id')
            ->first();

        if (! $latest || ! is_array($latest->after)) {
            return $defaults;
        }

        return $this->mergeSchedule($defaults, $latest->after);
    }

    /**
     * Update one or more days in the user's 7-day focus allocation schedule and record an audit decision.
     *
     * @param  array<string, array<string, mixed>>  $updates
     * @return array<string, array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}>
     */
    public function updateSchedule(int $userId, array $updates, string $source = 'web'): array
    {
        $before = $this->getSchedule($userId);
        $after = $this->mergeSchedule($before, $updates);

        PriorityDecision::create([
            'user_id' => $userId,
            'actor_user_id' => $userId,
            'action' => PriorityDecision::ACTION_WEEKLY_FOCUS,
            'source' => mb_substr($source, 0, 10),
            'reason' => 'Updated weekly day-of-week focus allocation schedule',
            'before' => $before,
            'after' => $after,
            'created_at' => now(),
        ]);

        return $after;
    }

    /**
     * Return the active focus allocation rule for a specific date.
     *
     * @return array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}
     */
    public function forDate(int $userId, CarbonInterface $date): array
    {
        $schedule = $this->getSchedule($userId);
        $dayKey = strtolower($date->englishDayOfWeek);

        return $schedule[$dayKey] ?? $schedule['monday'];
    }

    /**
     * Determine whether a Todo matches the given day's focus allocation theme/tags.
     * P0 Todos always override theme restrictions and return true.
     *
     * @param  array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}  $allocation
     */
    public function matchesTodo(Todo $todo, array $allocation, CarbonInterface $now): bool
    {
        if ($this->isP0Active($todo, $now)) {
            return true;
        }

        $targetTags = array_map('strtolower', $allocation['tags'] ?? []);
        $todoTags = $todo->relationLoaded('tags')
            ? $todo->tags->pluck('name')->map(static fn ($n) => strtolower((string) $n))->all()
            : [];

        foreach ($todoTags as $tagName) {
            if (in_array($tagName, $targetTags, true)) {
                return true;
            }
        }

        $haystack = strtolower($todo->title.' '.strip_tags((string) ($todo->description ?? '')));
        foreach ($targetTags as $targetTag) {
            $keyword = str_contains($targetTag, ':')
                ? substr($targetTag, strpos($targetTag, ':') + 1)
                : $targetTag;
            if ($keyword !== '' && preg_match('/\b'.preg_quote($keyword, '/').'\b/', $haystack) === 1) {
                return true;
            }
        }

        $themeWords = array_filter(
            preg_split('/[^a-z0-9]+/i', strtolower($allocation['theme'] ?? '')) ?: [],
            static fn (string $w): bool => strlen($w) >= 3
        );

        foreach ($themeWords as $word) {
            if (preg_match('/\b'.preg_quote($word, '/').'\b/', $haystack) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build the full month calendar grid (Monday-start weeks), active day details,
     * and unscheduled backlog grouped by matching day theme.
     *
     * @return array<string, mixed>
     */
    public function buildCalendar(int $userId, CarbonImmutable $monthDate, CarbonImmutable $activeDate): array
    {
        $schedule = $this->getSchedule($userId);
        $monthStart = $monthDate->startOfMonth();
        $monthEnd = $monthDate->endOfMonth();
        $gridStart = $monthStart->startOfWeek(CarbonInterface::MONDAY);
        $gridEnd = $monthEnd->endOfWeek(CarbonInterface::SUNDAY);

        $todos = Todo::query()
            ->where('user_id', $userId)
            ->where('type', Todo::TYPE_TODO)
            ->where('archived', false)
            ->with('tags:id,name,color')
            ->orderBy('is_completed')
            ->orderByDesc('is_p0')
            ->orderBy('kanban_order')
            ->get();

        $byDate = [];
        $unscheduled = [];

        foreach ($todos as $todo) {
            if ($todo->due_date !== null) {
                $key = $todo->due_date->format('Y-m-d');
                $byDate[$key][] = $todo;
            } elseif (! $todo->is_completed) {
                $unscheduled[] = $todo;
            }
        }

        $days = [];
        $cursor = $gridStart;
        $todayStr = CarbonImmutable::now()->format('Y-m-d');
        $activeDateStr = $activeDate->format('Y-m-d');

        while ($cursor->lessThanOrEqualTo($gridEnd)) {
            $dateStr = $cursor->format('Y-m-d');
            $dayKey = strtolower($cursor->englishDayOfWeek);
            $allocation = $schedule[$dayKey] ?? $schedule['monday'];
            $dayTodos = $byDate[$dateStr] ?? [];

            $serializedTodos = array_map(function (Todo $todo) use ($allocation, $cursor): array {
                return $this->serializeTodo($todo, $allocation, $cursor);
            }, $dayTodos);

            $recommended = [];
            foreach ($unscheduled as $candidate) {
                if ($this->matchesTodo($candidate, $allocation, $cursor)) {
                    $recommended[] = $this->serializeTodo($candidate, $allocation, $cursor);
                    if (count($recommended) >= 5) {
                        break;
                    }
                }
            }

            $days[] = [
                'date' => $dateStr,
                'day_number' => (int) $cursor->day,
                'day_key' => $dayKey,
                'day_short' => $cursor->format('D'),
                'is_today' => $dateStr === $todayStr,
                'is_active' => $dateStr === $activeDateStr,
                'is_current_month' => $cursor->month === $monthDate->month,
                'allocation' => $allocation,
                'todos' => $serializedTodos,
                'recommended_todos' => $recommended,
            ];

            $cursor = $cursor->addDay();
        }

        $activeCell = collect($days)->firstWhere('date', $activeDateStr) ?? $days[0];

        return [
            'month' => $monthDate->format('Y-m'),
            'month_label' => $monthDate->format('F Y'),
            'prev_month' => $monthDate->subMonth()->format('Y-m'),
            'next_month' => $monthDate->addMonth()->format('Y-m'),
            'active_date' => $activeDateStr,
            'active_day' => $activeCell,
            'days' => $days,
            'unscheduled_todos' => array_map(
                fn (Todo $t): array => $this->serializeTodo($t, $activeCell['allocation'], $activeDate),
                array_slice($unscheduled, 0, 30)
            ),
        ];
    }

    /**
     * @param  array<string, array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}>  $base
     * @param  array<string, mixed>  $overrides
     * @return array<string, array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}>
     */
    private function mergeSchedule(array $base, array $overrides): array
    {
        $merged = $base;

        foreach (self::DAYS as $dayKey) {
            if (! isset($overrides[$dayKey]) || ! is_array($overrides[$dayKey])) {
                continue;
            }

            $entry = $overrides[$dayKey];
            $theme = trim((string) ($entry['theme'] ?? $merged[$dayKey]['theme']));
            $color = trim((string) ($entry['color'] ?? $merged[$dayKey]['color']));
            $description = trim((string) ($entry['description'] ?? $merged[$dayKey]['description']));

            $rawTags = $entry['tags'] ?? $merged[$dayKey]['tags'];
            if (is_string($rawTags)) {
                $rawTags = array_filter(array_map('trim', explode(',', $rawTags)));
            }
            $tags = [];
            if (is_array($rawTags)) {
                foreach ($rawTags as $t) {
                    if (is_string($t) && trim($t) !== '') {
                        $tags[] = mb_substr(trim($t), 0, 80);
                    }
                }
            }

            $merged[$dayKey] = [
                'day' => $dayKey,
                'label' => $merged[$dayKey]['label'],
                'theme' => $theme !== '' ? mb_substr($theme, 0, 120) : $merged[$dayKey]['theme'],
                'tags' => array_values(array_unique($tags)),
                'color' => preg_match('/^#[0-9A-Fa-f]{6}$/', $color) === 1 ? $color : $merged[$dayKey]['color'],
                'description' => mb_substr($description, 0, 300),
            ];
        }

        return $merged;
    }

    /**
     * @param  array{day: string, label: string, theme: string, tags: array<int, string>, color: string, description: string}  $allocation
     * @return array<string, mixed>
     */
    private function serializeTodo(Todo $todo, array $allocation, CarbonInterface $date): array
    {
        $isP0 = $this->isP0Active($todo, $date);

        return [
            'id' => (int) $todo->id,
            'title' => (string) $todo->title,
            'due_date' => $todo->due_date?->format('Y-m-d'),
            'priority' => $todo->priority,
            'importance' => $todo->importance,
            'is_completed' => (bool) $todo->is_completed,
            'is_p0' => $isP0,
            'matches_theme' => $this->matchesTodo($todo, $allocation, $date),
            'tags' => $todo->relationLoaded('tags')
                ? $todo->tags->map(static fn ($tag): array => [
                    'id' => (int) $tag->id,
                    'name' => (string) $tag->name,
                    'color' => (string) $tag->color,
                ])->all()
                : [],
        ];
    }

    private function isP0Active(Todo $todo, CarbonInterface $now): bool
    {
        if (! $todo->is_p0) {
            return false;
        }

        return $todo->p0_expires_at === null || $todo->p0_expires_at->greaterThanOrEqualTo($now);
    }
}
