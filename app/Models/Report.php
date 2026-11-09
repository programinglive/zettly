<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    use HasFactory;

    const KIND_DAILY = 'daily';

    const KIND_WEEKLY = 'weekly';

    const KIND_MONTHLY = 'monthly';

    const KIND_YEARLY = 'yearly';

    protected $fillable = [
        'user_id',
        'period_kind',
        'period_start',
        'period_end',
        'report_key',
        'content',
        'generated_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'generated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(ReportDelivery::class);
    }

    public function summary(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ReportSummary::class);
    }
}
