<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FocusStatusEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'focus_id',
        'user_id',
        'action',
        'reason',
    ];

    public function focus(): BelongsTo
    {
        return $this->belongsTo(Focus::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
