<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportDelivery extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'pending';

    const STATUS_DELIVERED = 'delivered';

    const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'report_id',
        'channel',
        'status',
        'attempts',
        'last_error',
        'delivered_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'delivered_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}
