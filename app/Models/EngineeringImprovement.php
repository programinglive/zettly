<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngineeringImprovement extends Model
{
    public const STATES = [
        'OBSERVED',
        'TRIAGED',
        'PROPOSED',
        'APPROVED_BY_POLICY',
        'IN_PROGRESS',
        'IMPLEMENTED',
        'MEASURING',
        'EFFECTIVE',
        'INEFFECTIVE',
        'INCONCLUSIVE',
        'REVERTED',
        'CLOSED',
    ];

    public const SAFETY_SAFE_AUTO = 'safe_auto';

    public const SAFETY_MANUAL_REVIEW = 'manual_review';

    public const AUTO_PROMOTE_THRESHOLD = 80;

    /**
     * Compute a deterministic 0–100 Pareto priority score from priority tier and occurrence frequency.
     */
    public function priorityScore(): int
    {
        $base = match (strtoupper((string) $this->priority)) {
            'P0' => 85,
            'P1' => 75,
            'P2' => 55,
            default => 40,
        };

        $frequencyBonus = min(20, max(0, ((int) $this->occurrence_count - 1) * 5));

        return min(100, $base + $frequencyBonus);
    }

    /**
     * Determine whether this improvement can be safely auto-promoted into the Pareto Priority Queue
     * (`safe_auto`) or requires explicit human triage (`manual_review`).
     */
    public function safetyLevel(): string
    {
        $evidence = is_array($this->evidence) ? $this->evidence : [];
        if (! empty($evidence['safety_level']) && in_array($evidence['safety_level'], [self::SAFETY_SAFE_AUTO, self::SAFETY_MANUAL_REVIEW], true)) {
            return (string) $evidence['safety_level'];
        }

        $reason = strtolower((string) ($this->title.' '.$this->description.' '.($evidence['normalized_reason'] ?? '')));
        $unsafePatterns = [
            'dropcolumn',
            'droptable',
            'destructive',
            'policy_self_modification',
            'unauthorized merge',
            'permission violation',
        ];
        foreach ($unsafePatterns as $pattern) {
            if (str_contains($reason, $pattern)) {
                return self::SAFETY_MANUAL_REVIEW;
            }
        }

        return self::SAFETY_SAFE_AUTO;
    }

    /**
     * Eligible for automatic promotion into the Zettly Pareto Priority Queue (`/priority`)
     * when `priority_score >= 80` and `safety_level === 'safe_auto'`.
     */
    public function isAutoPromotableToPriorityQueue(int $minScore = self::AUTO_PROMOTE_THRESHOLD): bool
    {
        return $this->priorityScore() >= $minScore
            && $this->safetyLevel() === self::SAFETY_SAFE_AUTO
            && ! in_array($this->status, ['EFFECTIVE', 'REVERTED', 'CLOSED'], true);
    }

    public function promotedTodoId(): ?int
    {
        $evidence = is_array($this->evidence) ? $this->evidence : [];

        return isset($evidence['promoted_todo_id']) ? (int) $evidence['promoted_todo_id'] : null;
    }

    protected $fillable = [
        'user_id',
        'fingerprint',
        'action_code',
        'title',
        'description',
        'owner_role',
        'priority',
        'status',
        'occurrence_count',
        'source_period_key',
        'expected_outcome',
        'verification_criteria',
        'evidence',
        'effectiveness_metrics',
    ];

    protected $casts = [
        'occurrence_count' => 'integer',
        'evidence' => 'array',
        'effectiveness_metrics' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
