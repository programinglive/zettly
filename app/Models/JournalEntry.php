<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntry extends Model
{
    use HasFactory;

    const KIND_ACTIVITY = 'activity';

    const KIND_DECISION = 'decision';

    const KIND_BLOCKER = 'blocker';

    const KIND_OUTCOME = 'outcome';

    const KIND_HANDOFF = 'handoff';

    protected $fillable = [
        'user_id',
        'entry_date',
        'kind',
        'content',
        'source',
        'todo_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class);
    }
}
