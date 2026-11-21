<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngineeringRetrospective extends Model
{
    public const KIND_DAILY = 'daily';
    public const KIND_WEEKLY = 'weekly';
    public const KIND_MONTHLY = 'monthly';

    protected $fillable = [
        'user_id',
        'period_kind',
        'period_key',
        'timezone',
        'period_start',
        'period_end',
        'title',
        'version',
        'status',
        'metrics',
        'sections',
        'markdown_content',
        'version_history',
        'generated_at',
        'regenerated_at',
    ];

    protected $casts = [
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'version' => 'integer',
        'metrics' => 'array',
        'sections' => 'array',
        'version_history' => 'array',
        'generated_at' => 'datetime',
        'regenerated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
