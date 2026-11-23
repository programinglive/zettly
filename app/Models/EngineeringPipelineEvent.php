<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngineeringPipelineEvent extends Model
{
    public const STAGE_COMMIT = 'commit';
    public const STAGE_PULL_REQUEST = 'pull_request';
    public const STAGE_CI = 'ci';
    public const STAGE_BUILD = 'build';
    public const STAGE_RELEASE = 'release';
    public const STAGE_DEPLOY = 'deploy';
    public const STAGE_VERIFY = 'verify';
    public const STAGE_CODE_GRAPH = 'code_graph';

    protected $fillable = [
        'engineering_project_id',
        'external_event_id',
        'stage',
        'status',
        'commit_sha',
        'ref_name',
        'pr_number',
        'workflow_name',
        'run_id',
        'duration_seconds',
        'error_summary',
        'source_url',
        'source_provenance',
        'occurred_at',
        'metadata',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'metadata' => 'array',
        'pr_number' => 'integer',
        'duration_seconds' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(EngineeringProject::class, 'engineering_project_id');
    }
}
