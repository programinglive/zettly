<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'created_by',
        'name',
        'slug',
        'description',
        'logo_url',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'organization_members', 'organization_id', 'user_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function todos(): HasMany
    {
        return $this->hasMany(Todo::class);
    }

    public function drawings(): HasMany
    {
        return $this->hasMany(Drawing::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }
}
