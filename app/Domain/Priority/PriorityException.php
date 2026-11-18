<?php

namespace App\Domain\Priority;

/**
 * A priority change the owner is not allowed to make as asked.
 *
 * The API maps `code` to a machine-readable JSON field and `getMessage()` to the
 * human sentence; nothing else in the stack invents its own error vocabulary.
 */
class PriorityException extends \RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly array $context = [],
    ) {
        parent::__construct($message);
    }

    public static function wipLimitReached(int $limit): self
    {
        return new self(
            'wip_limit_reached',
            "Today already has {$limit} committed tasks. Finish or drop one before adding another.",
            ['wip_limit' => $limit],
        );
    }

    public static function capacityExceeded(int $capacity, int $requested): self
    {
        return new self(
            'capacity_exceeded',
            "This would plan {$requested} minutes against a {$capacity}-minute day.",
            ['capacity_minutes' => $capacity, 'requested_minutes' => $requested],
        );
    }

    public static function notReady(array $missing): self
    {
        return new self(
            'not_ready',
            'This task is not ready for the queue: '.implode(', ', $missing).'.',
            ['missing' => $missing],
        );
    }

    public static function dependencyCycle(array $path): self
    {
        return new self(
            'dependency_cycle',
            'That dependency would create a cycle: '.implode(' -> ', $path).'.',
            ['path' => $path],
        );
    }

    public static function blocked(array $blockingIds): self
    {
        return new self(
            'blocked',
            'This task is blocked by another open task.',
            ['blocked_by' => $blockingIds],
        );
    }

    public static function reasonRequired(): self
    {
        return new self('reason_required', 'A reason of at least 8 characters is required for this change.');
    }

    public static function p0LimitReached(int $limit): self
    {
        return new self(
            'p0_limit_reached',
            "At most {$limit} production-critical tasks may be live at once. Clear one first.",
            ['max_p0' => $limit],
        );
    }

    public static function p0ExpiryTooLong(int $hours, int $max): self
    {
        return new self(
            'p0_expiry_too_long',
            "A production-critical declaration may last at most {$max} hours, not {$hours}.",
            ['requested_hours' => $hours, 'max_hours' => $max],
        );
    }

    public static function forbidden(string $message = 'You may not change this.'): self
    {
        return new self('forbidden', $message);
    }

    public static function notFound(string $what = 'Task'): self
    {
        return new self('not_found', "{$what} not found.");
    }
}
