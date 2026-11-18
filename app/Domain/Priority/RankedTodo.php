<?php

namespace App\Domain\Priority;

use App\Models\Todo;

/**
 * One todo with the key that ordered it and the sentences that explain it.
 */
final class RankedTodo
{
    /**
     * The positions that pushed this item up, in the order they applied.
     *
     * @var array<int, string>
     */
    public readonly array $reasons;

    /**
     * @param  array<int, array{label: string, value: int, reason: ?string}>  $parts
     */
    public function __construct(
        public readonly Todo $todo,
        public readonly array $parts,
        public readonly bool $isP0 = false,
        public readonly bool $isMainWork = false,
        public readonly array $blockedBy = [],
    ) {
        $this->reasons = array_values(array_filter(
            array_map(fn (array $part) => $part['reason'], $parts),
            fn (?string $reason) => $reason !== null,
        ));
    }

    /**
     * @return array<int, int>
     */
    public function key(): array
    {
        return array_map(fn (array $part) => $part['value'], $this->parts);
    }
}
