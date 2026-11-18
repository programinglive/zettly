<?php

namespace App\Domain\Priority;

use App\Models\Todo;
use Carbon\CarbonImmutable;

/**
 * The one ordering rule.
 *
 * A lexicographic key, not a weighted score: every position is a policy decision
 * the owner can read, and the first position that differs decides the order. No
 * controller, CLI or MCP client is allowed to re-implement this.
 *
 * Key positions (final owner policy):
 *   0 P0 production critical      always first
 *   1 Main Work                   outranks deadlines while main_work_strict
 *   2 due bucket                  overdue, today, <=3d, <=7d, later, undated
 *   3 Eisenhower quadrant         Q1, Q2, Q3, Q4, unset
 *   4 unblocks                    how much work this frees
 *   5 age                         oldest first, to prevent starvation
 *   6 order / id                  stable tie-break
 */
final class PriorityEngine
{
    public const LABEL_P0 = 'p0';

    public const LABEL_MAIN_WORK = 'main_work';

    public const LABEL_DUE = 'due';

    public const LABEL_IMPORTANCE = 'importance';

    public const LABEL_UNBLOCKS = 'unblocks';

    public const LABEL_AGE = 'age';

    public const LABEL_ORDER = 'order';

    /**
     * @param  iterable<Todo>  $todos
     * @return array<int, RankedTodo>
     */
    public static function rank(iterable $todos, PriorityContext $context): array
    {
        $ranked = [];

        foreach ($todos as $todo) {
            $ranked[] = self::rankOne($todo, $context);
        }

        usort($ranked, static function (RankedTodo $a, RankedTodo $b): int {
            $left = $a->key();
            $right = $b->key();
            $length = max(count($left), count($right));

            for ($i = 0; $i < $length; $i++) {
                $comparison = ($left[$i] ?? 0) <=> ($right[$i] ?? 0);
                if ($comparison !== 0) {
                    return $comparison;
                }
            }

            return 0;
        });

        return $ranked;
    }

    /**
     * Name the single position that put $above in front of $below.
     *
     * @return array{decided_by: string, detail: string}
     */
    public static function explain(RankedTodo $below, RankedTodo $above): array
    {
        $left = $above->key();
        $right = $below->key();
        $length = max(count($left), count($right));

        for ($i = 0; $i < $length; $i++) {
            if (($left[$i] ?? 0) === ($right[$i] ?? 0)) {
                continue;
            }

            $part = $above->parts[$i] ?? $below->parts[$i] ?? ['label' => 'order', 'reason' => null];

            return [
                'decided_by' => $part['label'],
                'detail' => $part['reason'] ?? self::labelText($part['label']),
            ];
        }

        return ['decided_by' => 'order', 'detail' => 'Both tasks carry the same priority signals.'];
    }

    private static function rankOne(Todo $todo, PriorityContext $context): RankedTodo
    {
        $isP0 = $todo->isP0Live($context->today);
        $isMain = $context->isMainWork($todo);
        $parts = [];

        $parts[] = [
            'label' => self::LABEL_P0,
            'value' => $isP0 ? 0 : 1,
            'reason' => $isP0 ? 'Production critical: '.($todo->p0_reason ?: 'declared P0') : null,
        ];

        $mainPart = [
            'label' => self::LABEL_MAIN_WORK,
            'value' => $isMain ? 0 : 1,
            'reason' => $isMain ? 'Main work: '.($context->mainWorkLabel() ?: 'protected') : null,
        ];
        $duePart = self::duePart($todo, $context->today);

        if ($context->settings->main_work_strict) {
            $parts[] = $mainPart;
            $parts[] = $duePart;
        } else {
            $parts[] = $duePart;
            $parts[] = $mainPart;
        }

        $parts[] = self::importancePart($todo);

        $unblocks = $context->unblockCountFor($todo);
        $parts[] = [
            'label' => self::LABEL_UNBLOCKS,
            'value' => -$unblocks,
            'reason' => $unblocks > 0 ? "Finishing this unblocks {$unblocks} task".($unblocks === 1 ? '' : 's') : null,
        ];

        $ageDays = self::ageInDays($todo, $context->today);
        $parts[] = [
            'label' => self::LABEL_AGE,
            'value' => -$ageDays,
            'reason' => $ageDays >= 7 ? "Created {$ageDays} days ago" : null,
        ];

        $parts[] = [
            'label' => self::LABEL_ORDER,
            'value' => $todo->kanban_order ?? PHP_INT_MAX,
            'reason' => null,
        ];

        $parts[] = [
            'label' => 'id',
            'value' => (int) $todo->id,
            'reason' => null,
        ];

        return new RankedTodo(
            todo: $todo,
            parts: $parts,
            isP0: $isP0,
            isMainWork: $isMain,
            blockedBy: $context->blockingIdsFor($todo),
        );
    }

    /**
     * @return array{label: string, value: int, reason: ?string}
     */
    private static function duePart(Todo $todo, CarbonImmutable $today): array
    {
        if ($todo->due_date === null) {
            return ['label' => self::LABEL_DUE, 'value' => 5, 'reason' => null];
        }

        $due = CarbonImmutable::instance($todo->due_date)->startOfDay();
        $days = (int) $today->startOfDay()->diffInDays($due, false);

        if ($days < 0) {
            return [
                'label' => self::LABEL_DUE,
                'value' => 0,
                'reason' => 'Overdue since '.$due->toDateString(),
            ];
        }

        if ($days === 0) {
            return ['label' => self::LABEL_DUE, 'value' => 1, 'reason' => 'Due today'];
        }

        return [
            'label' => self::LABEL_DUE,
            'value' => $days <= 3 ? 2 : ($days <= 7 ? 3 : 4),
            'reason' => "Due in {$days} days",
        ];
    }

    /**
     * @return array{label: string, value: int, reason: ?string}
     */
    private static function importancePart(Todo $todo): array
    {
        $important = $todo->importance === Todo::IMPORTANCE_IMPORTANT;
        $urgent = $todo->priority === Todo::PRIORITY_URGENT;

        if ($todo->importance === null || $todo->priority === null) {
            return ['label' => self::LABEL_IMPORTANCE, 'value' => 4, 'reason' => null];
        }

        if ($important && $urgent) {
            return ['label' => self::LABEL_IMPORTANCE, 'value' => 0, 'reason' => 'Important and urgent'];
        }

        if ($important) {
            return ['label' => self::LABEL_IMPORTANCE, 'value' => 1, 'reason' => 'Important, not urgent'];
        }

        if ($urgent) {
            return ['label' => self::LABEL_IMPORTANCE, 'value' => 2, 'reason' => 'Urgent, not important'];
        }

        return ['label' => self::LABEL_IMPORTANCE, 'value' => 3, 'reason' => 'Neither important nor urgent'];
    }

    private static function ageInDays(Todo $todo, CarbonImmutable $today): int
    {
        if ($todo->created_at === null) {
            return 0;
        }

        return max(0, (int) CarbonImmutable::instance($todo->created_at)->startOfDay()->diffInDays($today->startOfDay(), false));
    }

    private static function labelText(string $label): string
    {
        return match ($label) {
            self::LABEL_P0 => 'Production critical',
            self::LABEL_MAIN_WORK => 'Main work',
            self::LABEL_DUE => 'Due date',
            self::LABEL_IMPORTANCE => 'Importance',
            self::LABEL_UNBLOCKS => 'Unblocked work',
            self::LABEL_AGE => 'Age',
            default => 'Queue order',
        };
    }
}
