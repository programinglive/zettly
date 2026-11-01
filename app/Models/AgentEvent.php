<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'agent_session_id',
        'event_key',
        'kind',
        'occurred_at',
        'detail',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AgentSession::class, 'agent_session_id');
    }
}
