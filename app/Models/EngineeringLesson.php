<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngineeringLesson extends Model
{
    public const CONFIDENCE_CONFIRMED = 'confirmed';
    public const CONFIDENCE_HYPOTHESIS = 'hypothesis';
    public const CONFIDENCE_INVALIDATED = 'invalidated';

    protected $fillable = [
        'user_id',
        'fingerprint',
        'title',
        'category',
        'affected_system',
        'confidence',
        'context',
        'applicable_conditions',
        'known_limitations',
        'version',
        'superseded_by_id',
        'source_evidence',
        'recorded_at',
    ];

    protected $casts = [
        'version' => 'integer',
        'superseded_by_id' => 'integer',
        'source_evidence' => 'array',
        'recorded_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
