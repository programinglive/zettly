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
        'REVERTED',
        'CLOSED',
    ];

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
