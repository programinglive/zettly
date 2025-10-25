<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'endpoint',
        'auth_token',
        'p256dh_token',
    ];

    /**
     * Get the user that owns the subscription.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
