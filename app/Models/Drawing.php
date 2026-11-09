<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Drawing extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'organization_id',
        'title',
        'document',
        'thumbnail',
    ];

    protected $casts = [
        'document' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Tags attached to this drawing.
     *
     * Added 10 November 2026 so the zettelkasten relations reach drawings too;
     * before this a drawing could not be related to anything. Uses the same
     * pivot shape as `todo_tag`.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'drawing_tag');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
