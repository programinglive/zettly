<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodingAgentJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'todo_id', 'workflow_task_id', 'repository', 'instruction',
        'client_request_id', 'status', 'lease_token_hash', 'leased_until',
        'last_heartbeat_at', 'branch', 'commit_sha', 'pr_url', 'test_summary',
        'tests_passed', 'target_environment',
    ];

    protected $hidden = ['lease_token_hash'];

    protected function casts(): array
    {
        return [
            'leased_until' => 'datetime',
            'last_heartbeat_at' => 'datetime',
            'tests_passed' => 'boolean',
        ];
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(CodingAgentJobEvent::class, 'coding_agent_job_id');
    }
}
