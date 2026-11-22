<?php

namespace App\Services;

use App\Http\Controllers\DashboardController;
use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;

class WorkspaceSummaryService
{
    private const TIMEZONE = 'Asia/Jakarta';

    private const ALLOWED_DAYS = [7, 30, 90];

    private const PALETTE = [
        '#2563EB', // blue
        '#10B981', // emerald
        '#F59E0B', // amber
        '#8B5CF6', // violet
        '#EC4899', // pink
        '#06B6D4', // cyan
        '#F97316', // orange
        '#64748B', // slate
    ];

    public function build(User $user, int $days = 30, ?CarbonImmutable $referenceDate = null): array
    {
        $days = in_array($days, self::ALLOWED_DAYS, true) ? $days : 30;
        $now = ($referenceDate ?? CarbonImmutable::now(self::TIMEZONE))->setTimezone(self::TIMEZONE);
        $end = $now->endOfDay();
        $start = $now->subDays($days - 1)->startOfDay();
        $prevEnd = $start->subSecond();
        $prevStart = $start->subDays($days);

        $startUtc = $start->setTimezone('UTC');
        $endUtc = $end->setTimezone('UTC');
        $prevStartUtc = $prevStart->setTimezone('UTC');
        $prevEndUtc = $prevEnd->setTimezone('UTC');

        // Completed tasks in current window (strictly user-scoped)
        $completedInWindow = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->with(['tags:id,name,color', 'focus:id,title'])
            ->get(['id', 'title', 'priority', 'importance', 'is_p0', 'is_completed', 'completed_at', 'focus_id']);

        $prevCompletedCount = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$prevStartUtc, $prevEndUtc])
            ->count();

        // Currently open tasks (for live project/priority/health visibility)
        $openTasks = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', false)
            ->with(['tags:id,name,color', 'focus:id,title'])
            ->get(['id', 'title', 'description', 'due_date', 'priority', 'importance', 'is_p0', 'is_completed', 'focus_id']);

        $closedFocusesCount = $user->foci()
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->count();

        $activeFoci = $user->activeFoci()
            ->withCount([
                'todos as open_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', false),
                'todos as completed_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', true),
            ])
            ->orderByDesc('started_at')
            ->limit(8)
            ->get(['id', 'title', 'started_at']);

        // 1. Project breakdown (proyek:* tags first, fallback to Focus title, else Unassigned)
        $projectBuckets = [];
        $allRelevantTasks = $completedInWindow->concat($openTasks);

        foreach ($allRelevantTasks as $todo) {
            $projectTag = $todo->tags->first(fn ($tag) => str_starts_with(strtolower((string) $tag->name), 'proyek:'));
            if ($projectTag) {
                $slug = trim(substr((string) $projectTag->name, strlen('proyek:')));
                $key = strtolower($slug ?: 'general');
                $label = $slug ?: 'General';
                $color = $projectTag->color ?: null;
                $tagId = (int) $projectTag->id;
            } elseif ($todo->focus && trim((string) $todo->focus->title) !== '') {
                $label = mb_strimwidth(trim((string) $todo->focus->title), 0, 36, '…');
                $key = 'focus-'.(int) $todo->focus->id;
                $color = null;
                $tagId = null;
            } else {
                $key = 'unassigned';
                $label = 'General / Unassigned';
                $color = '#94A3B8';
                $tagId = null;
            }

            if (! isset($projectBuckets[$key])) {
                $projectBuckets[$key] = [
                    'key' => $key,
                    'label' => $label,
                    'color' => $color,
                    'tag_id' => $tagId,
                    'completed' => 0,
                    'open' => 0,
                    'total' => 0,
                ];
            }

            if ($todo->is_completed) {
                $projectBuckets[$key]['completed']++;
            } else {
                $projectBuckets[$key]['open']++;
            }
            $projectBuckets[$key]['total']++;
        }

        usort($projectBuckets, fn ($a, $b) => $b['total'] <=> $a['total'] ?: $b['completed'] <=> $a['completed'] ?: strcmp($a['label'], $b['label']));

        $totalProjectTasks = array_sum(array_column($projectBuckets, 'total'));
        $projects = [];
        foreach (array_slice($projectBuckets, 0, 8) as $idx => $bucket) {
            $bucket['color'] = $bucket['color'] ?: self::PALETTE[$idx % count(self::PALETTE)];
            $bucket['share_pct'] = $totalProjectTasks > 0
                ? (int) round(($bucket['total'] / $totalProjectTasks) * 100)
                : 0;
            $projects[] = $bucket;
        }

        // 2. Daily completion trend across the selected window (in Asia/Jakarta)
        $countsByDate = [];
        foreach ($completedInWindow as $todo) {
            if (! $todo->completed_at) {
                continue;
            }
            $dayKey = CarbonImmutable::parse($todo->completed_at)->setTimezone(self::TIMEZONE)->toDateString();
            $countsByDate[$dayKey] = ($countsByDate[$dayKey] ?? 0) + 1;
        }

        $dailyTrend = [];
        $peakDay = ['date' => null, 'label' => null, 'count' => 0];
        for ($i = 0; $i < $days; $i++) {
            $d = $start->addDays($i);
            $dateStr = $d->toDateString();
            $count = $countsByDate[$dateStr] ?? 0;
            $shortLabel = $d->format('M j');
            $dailyTrend[] = [
                'date' => $dateStr,
                'label' => $shortLabel,
                'count' => $count,
            ];
            if ($count > $peakDay['count']) {
                $peakDay = ['date' => $dateStr, 'label' => $shortLabel, 'count' => $count];
            }
        }

        // 3. Priority Mix (P0, P1, P2, P3, UNPRIORITIZED) across all tasks in window + open
        $priorityMeta = [
            'P0' => ['label' => 'P0 Critical', 'color' => '#EF4444'],
            'P1' => ['label' => 'P1 Urgent & Important', 'color' => '#F59E0B'],
            'P2' => ['label' => 'P2 Important / Urgent', 'color' => '#3B82F6'],
            'P3' => ['label' => 'P3 Routine', 'color' => '#64748B'],
            'UNPRIORITIZED' => ['label' => 'Unprioritized', 'color' => '#CBD5E1'],
        ];
        $priorityCounts = array_fill_keys(array_keys($priorityMeta), 0);
        foreach ($allRelevantTasks as $todo) {
            $tier = DashboardController::resolvePriorityTier((bool) $todo->is_p0, $todo->priority, $todo->importance);
            $priorityCounts[$tier] = ($priorityCounts[$tier] ?? 0) + 1;
        }
        $totalPriority = array_sum($priorityCounts);
        $priorityMix = [];
        foreach ($priorityMeta as $tier => $meta) {
            $count = $priorityCounts[$tier];
            $priorityMix[] = [
                'tier' => $tier,
                'label' => $meta['label'],
                'color' => $meta['color'],
                'count' => $count,
                'share_pct' => $totalPriority > 0 ? (int) round(($count / $totalPriority) * 100) : 0,
            ];
        }

        // 4. Work Types (tipe:* tags)
        $typeBuckets = [];
        foreach ($allRelevantTasks as $todo) {
            foreach ($todo->tags as $tag) {
                if (str_starts_with(strtolower((string) $tag->name), 'tipe:')) {
                    $typeSlug = strtolower(trim(substr((string) $tag->name, strlen('tipe:'))));
                    if ($typeSlug === '') {
                        continue;
                    }
                    if (! isset($typeBuckets[$typeSlug])) {
                        $typeBuckets[$typeSlug] = [
                            'key' => $typeSlug,
                            'label' => ucfirst($typeSlug),
                            'color' => $tag->color ?: null,
                            'count' => 0,
                        ];
                    }
                    $typeBuckets[$typeSlug]['count']++;
                }
            }
        }
        usort($typeBuckets, fn ($a, $b) => $b['count'] <=> $a['count'] ?: strcmp($a['label'], $b['label']));
        $totalTypes = array_sum(array_column($typeBuckets, 'count'));
        $workTypes = [];
        foreach (array_slice($typeBuckets, 0, 6) as $idx => $type) {
            $type['color'] = $type['color'] ?: self::PALETTE[($idx + 3) % count(self::PALETTE)];
            $type['share_pct'] = $totalTypes > 0 ? (int) round(($type['count'] / $totalTypes) * 100) : 0;
            $workTypes[] = $type;
        }

        // 5. Schedule Health & Active Focuses
        $todayStr = $now->toDateString();
        $overdueCount = $openTasks->filter(fn (Todo $t) => $t->due_date && $t->due_date->toDateString() < $todayStr)->count();
        $externalWaitingCount = $openTasks->filter(fn (Todo $t) => HumanRetrospectiveService::isExternalWaiting($t->title, $t->description))->count();

        $activeFocusList = $activeFoci->map(function ($focus) {
            $open = (int) ($focus->open_tasks_count ?? 0);
            $done = (int) ($focus->completed_tasks_count ?? 0);
            $total = $open + $done;

            return [
                'id' => (int) $focus->id,
                'title' => (string) $focus->title,
                'open_tasks_count' => $open,
                'completed_tasks_count' => $done,
                'progress_percent' => $total > 0 ? (int) round(($done / $total) * 100) : null,
                'ready_to_close' => $open === 0 && $done > 0,
            ];
        })->values()->all();

        // 6. KPIs & Human Takeaway
        $completedCount = $completedInWindow->count();
        $deltaPct = $prevCompletedCount > 0
            ? (int) round((($completedCount - $prevCompletedCount) / $prevCompletedCount) * 100)
            : ($completedCount > 0 ? 100 : 0);

        $namedProjectsCount = count(array_filter($projects, fn ($p) => $p['key'] !== 'unassigned'));
        $activeProjectsCount = $namedProjectsCount > 0 ? $namedProjectsCount : count($projects);

        $kpis = [
            'completed_tasks' => $completedCount,
            'prev_completed_tasks' => $prevCompletedCount,
            'completed_delta_pct' => $deltaPct,
            'closed_focuses' => $closedFocusesCount,
            'active_focuses' => count($activeFocusList),
            'active_projects' => $activeProjectsCount,
            'open_tasks' => $openTasks->count(),
            'overdue_tasks' => $overdueCount,
            'external_waiting_tasks' => $externalWaitingCount,
            'avg_per_day' => round($completedCount / $days, 1),
        ];

        $takeaway = $this->composeTakeaway($days, $kpis, $projects, $peakDay, $activeFocusList);

        return [
            'days' => $days,
            'range_label' => $start->format('M j').' – '.$end->format('M j, Y'),
            'kpis' => $kpis,
            'projects' => $projects,
            'daily_trend' => $dailyTrend,
            'peak_day' => $peakDay,
            'priority_mix' => $priorityMix,
            'work_types' => $workTypes,
            'active_focuses' => $activeFocusList,
            'takeaway' => $takeaway,
        ];
    }

    private function composeTakeaway(int $days, array $kpis, array $projects, array $peakDay, array $activeFocuses): string
    {
        $parts = [];
        $completed = $kpis['completed_tasks'];

        if ($completed > 0) {
            $trendText = $kpis['prev_completed_tasks'] > 0
                ? ($kpis['completed_delta_pct'] >= 0
                    ? "up {$kpis['completed_delta_pct']}% vs the previous {$days} days"
                    : 'down '.abs($kpis['completed_delta_pct'])."% vs the previous {$days} days")
                : "averaging {$kpis['avg_per_day']} tasks/day";
            $parts[] = "Over the last {$days} days you completed {$completed} " . ($completed === 1 ? 'task' : 'tasks') . " ({$trendText}).";
        } else {
            $parts[] = "No tasks were marked completed in the last {$days} days, with {$kpis['open_tasks']} open " . ($kpis['open_tasks'] === 1 ? 'task' : 'tasks') . ' in your workspace.';
        }

        if (! empty($projects)) {
            $top = $projects[0];
            $parts[] = "Most of your effort went into {$top['label']} ({$top['share_pct']}% of tracked work, {$top['completed']} done / {$top['open']} open).";
        }

        $readyToCloseCount = count(array_filter($activeFocuses, fn ($f) => ! empty($f['ready_to_close'])));
        if ($kpis['overdue_tasks'] > 0) {
            $parts[] = "{$kpis['overdue_tasks']} overdue " . ($kpis['overdue_tasks'] === 1 ? 'item needs' : 'items need') . ' attention on Calendar.';
        } elseif ($readyToCloseCount > 0) {
            $parts[] = "{$readyToCloseCount} active " . ($readyToCloseCount === 1 ? 'focus is' : 'focuses are') . ' already at 100% and ready to be closed.';
        } elseif ($kpis['external_waiting_tasks'] > 0) {
            $parts[] = "{$kpis['external_waiting_tasks']} external waiting " . ($kpis['external_waiting_tasks'] === 1 ? 'item is' : 'items are') . ' tracked on schedule.';
        } elseif ($peakDay['count'] > 0 && $peakDay['label']) {
            $parts[] = "Peak output was {$peakDay['count']} " . ($peakDay['count'] === 1 ? 'task' : 'tasks') . " on {$peakDay['label']}.";
        }

        return implode(' ', $parts);
    }
}
