<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EngineeringProject extends Model
{
    public const STATUS_SUCCESS = 'SUCCESS';
    public const STATUS_FAILED = 'FAILED';
    public const STATUS_RUNNING = 'RUNNING';
    public const STATUS_QUEUED = 'QUEUED';
    public const STATUS_BLOCKED = 'BLOCKED';
    public const STATUS_SKIPPED = 'SKIPPED';
    public const STATUS_UNKNOWN = 'UNKNOWN';
    public const STATUS_STALE = 'STALE';

    protected $fillable = [
        'user_id',
        'slug',
        'name',
        'provider',
        'repo_full_name',
        'default_branch',
        'environment',
        'target_url',
        'latest_release_tag',
        'latest_release_sha',
        'deployed_tag',
        'deployed_commit',
        'runtime_health_status',
        'github_status',
        'mcp_status',
        'mcp_version',
        'mcp_tools_count',
        'mcp_prompts_count',
        'blocking_incident',
        'last_synced_at',
        'last_sync_error',
        'metadata',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
        'metadata' => 'array',
        'mcp_tools_count' => 'integer',
        'mcp_prompts_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(EngineeringPipelineEvent::class);
    }
}
