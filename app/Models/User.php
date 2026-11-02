<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
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
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * The 2FA seed and recovery codes are deliberately hidden: the whole User
     * model is shared with every Inertia page (HandleInertiaRequests) and returned
     * by GET /api/user, so leaving them visible put the second factor in the
     * browser payload. Nothing broke while 2FA was unused - the columns were null
     * - but the moment a user enabled it their TOTP seed would have shipped to the
     * page, which is enough to mint valid codes.
     *
     * `role` is not fillable either: it is the super-admin flag, and the only
     * writer is User::assignRole(), which uses forceFill.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
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

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new QueuedVerifyEmail);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPassword($token));
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

    public function organizations()
    {
        return $this->belongsToMany(Organization::class, 'organization_members', 'user_id', 'organization_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function createdOrganizations()
    {
        return $this->hasMany(Organization::class, 'created_by');
    }

    public function organizationMembers()
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function habits()
    {
        return $this->hasMany(Habit::class);
    }

    public function agentSessions()
    {
        return $this->hasMany(AgentSession::class);
    }

    public function agentEvents()
    {
        return $this->hasMany(AgentEvent::class);
    }

    public function journalEntries()
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    public function reportDeliveries()
    {
        return $this->hasMany(ReportDelivery::class);
    }

    public function reportChannels()
    {
        return $this->hasMany(UserReportChannel::class);
    }
}
