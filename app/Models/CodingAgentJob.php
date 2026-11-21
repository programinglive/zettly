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
        'user_id', 'todo_id', 'workflow_task_id', 'parent_job_id', 'handoff_from_job_id',
        'repository', 'role', 'execution_mode', 'routing_profile', 'instruction', 'model',
        'client_request_id', 'status', 'lease_token_hash', 'leased_until',
        'last_heartbeat_at', 'branch', 'commit_sha', 'pr_url', 'test_summary',
        'tests_passed', 'target_environment', 'artifact_output',
        'reversibility_classification', 'risk_level', 'reversibility_assessment',
        'delivery_stage', 'merge_sha', 'release_tag', 'artifact_digest',
        'production_revision', 'delivery_state',
    ];

    protected $hidden = ['lease_token_hash'];

    protected static function booted(): void
    {
        static::creating(function (self $job): void {
            if (empty($job->model)) {
                $job->model = config('coding_agent.default_model', 'qwen3-5-397b-a17b:free');
            }
            if (empty($job->role)) {
                $job->role = 'developer';
            }
            if (empty($job->execution_mode)) {
                $job->execution_mode = 'code_write';
            }
            if (empty($job->routing_profile)) {
                $job->routing_profile = 'STANDARD';
            }
        });
    }

    protected function casts(): array
    {
        return [
            'leased_until' => 'datetime',
            'last_heartbeat_at' => 'datetime',
            'tests_passed' => 'boolean',
            'artifact_output' => 'array',
            'reversibility_assessment' => 'array',
            'delivery_state' => 'array',
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

    public function approvals(): HasMany
    {
        return $this->hasMany(CodingAgentApproval::class, 'coding_agent_job_id');
    }

    public function hasCurrentApproval(): bool
    {
        if (! $this->commit_sha || ! $this->target_environment) {
            return false;
        }

        return $this->approvals()->where('repository', $this->repository)
            ->where('target_environment', $this->target_environment)
            ->where('commit_sha', $this->commit_sha)->exists();
    }
}
