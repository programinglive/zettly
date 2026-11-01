<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserReportChannel extends Model
{
    use HasFactory;

    const CHANNEL_DISCORD = 'discord';

    const CHANNEL_TELEGRAM = 'telegram';

    protected $fillable = [
        'user_id',
        'channel',
        'webhook_url',
        'chat_id',
        'enabled',
    ];

    protected $casts = [
        'webhook_url' => 'encrypted',
        'enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('enabled', true);
    }
}
