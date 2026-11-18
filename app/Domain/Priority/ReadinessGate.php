<?php

namespace App\Domain\Priority;

use App\Models\Todo;

/**
 * Decides whether a task may enter the daily queue at all.
 *
 * A task that just landed is in the inbox; it becomes workable only when the
 * owner accepts it and the policy's readiness fields are present. A live P0
 * bypasses the gate: production is already broken, so waiting for an estimate
 * would be the wrong answer.
 */
final class ReadinessGate
{
    public const INBOX = 'inbox';

    public const NEEDS_FOCUS = 'needs_focus';

    public const NEEDS_ESTIMATE = 'needs_estimate';

    /**
     * @return array{ready: bool, reasons: array<int, string>}
     */
    public static function evaluate(Todo $todo, PriorityContext $context): array
    {
        if ($todo->isP0Live()) {
            return ['ready' => true, 'reasons' => ['p0']];
        }

        if ($todo->queue_state === Todo::QUEUE_INBOX) {
            return ['ready' => false, 'reasons' => [self::INBOX]];
        }

        $reasons = [];

        if ($context->settings->require_focus && $todo->focus_id === null) {
            $reasons[] = self::NEEDS_FOCUS;
        }

        if ($context->settings->require_estimate && $todo->estimate_minutes === null) {
            $reasons[] = self::NEEDS_ESTIMATE;
        }

        $blocking = $context->blockingIdsFor($todo);
        if ($blocking !== []) {
            $reasons[] = 'blocked_by:'.implode(',', $blocking);
        }

        return ['ready' => $reasons === [], 'reasons' => $reasons];
    }
}
