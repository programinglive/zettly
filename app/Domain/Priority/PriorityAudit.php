<?php

namespace App\Domain\Priority;

use App\Models\PriorityDecision;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Writes the audit row for a priority change.
 *
 * Every service calls this inside the same transaction as the change, so a
 * mutation without its decision row cannot commit.
 */
final class PriorityAudit
{
    public function record(
        int $userId,
        string $action,
        string $source,
        ?string $reason,
        ?int $todoId = null,
        ?int $focusId = null,
        ?array $before = null,
        ?array $after = null,
        ?int $actorUserId = null,
        ?int $actorTokenId = null,
    ): PriorityDecision {
        return DB::transaction(function () use ($userId, $action, $source, $reason, $todoId, $focusId, $before, $after, $actorUserId, $actorTokenId) {
            return PriorityDecision::create([
                'user_id' => $userId,
                'todo_id' => $todoId,
                'focus_id' => $focusId,
                'action' => $action,
                'source' => $source,
                'actor_user_id' => $actorUserId ?? Auth::id(),
                'actor_token_id' => $actorTokenId ?? optional(Auth::user()?->currentAccessToken())->id,
                'reason' => $reason,
                'before' => $before,
                'after' => $after,
            ]);
        });
    }
}
