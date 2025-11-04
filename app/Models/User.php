<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'workspace_view',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'workspace_view' => 'string',
            'role' => UserRole::class,
        ];
    }

    public function scopeSuperAdmins($query)
    {
        return $query->where('role', UserRole::SUPER_ADMIN->value);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SUPER_ADMIN;
    }

    public function assignRole(UserRole|string $role): void
    {
        $this->forceFill([
            'role' => $role instanceof UserRole ? $role->value : $role,
        ])->save();
    }

    public function todos()
    {
        return $this->hasMany(Todo::class);
    }

    public function tags()
    {
        return $this->hasMany(Tag::class);
    }

    public function drawings()
    {
        return $this->hasMany(Drawing::class);
    }

    public function pushSubscriptions()
    {
        return $this->hasMany(PushSubscription::class);
    }

    public function foci()
    {
        return $this->hasMany(Focus::class);
    }

    public function currentFocus()
    {
        return $this->hasOne(Focus::class)
            ->whereNull('completed_at')
            ->orderBy('started_at', 'desc');
    }
}
