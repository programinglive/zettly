<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSummary extends Model
{
    use HasFactory;

    protected $table = 'report_summaries';

    protected $fillable = [
        'report_id',
        'user_id',
        'period_kind',
        'period_start',
        'period_end',
        'digest',
        'active_minutes',
        'tasks_completed',
        'tasks_open',
        'projects_minutes',
        'categories',
        'tags',
        'machines',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'projects_minutes' => 'array',
        'categories' => 'array',
        'tags' => 'array',
        'machines' => 'array',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
