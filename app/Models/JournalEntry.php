<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        'organization_id',
        'focus_id',
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

    /**
     * Tags attached to this journal entry.
     *
     * Added 10 November 2026 so outcomes carry the same zettelkasten relations
     * as the todo they report on. Uses the same pivot shape as `todo_tag`.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'journal_entry_tag');
    }

    /**
     * Optional grouping link. When absent it is derived from `todo_id` on
     * create; when both are present an explicit focus_id wins.
     */
    public function focus(): BelongsTo
    {
        return $this->belongsTo(Focus::class);
    }
}
