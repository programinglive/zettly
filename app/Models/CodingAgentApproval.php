<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodingAgentApproval extends Model
{
    protected $fillable = ['coding_agent_job_id', 'approved_by', 'repository', 'target_environment', 'commit_sha'];

    public function job(): BelongsTo
    {
        return $this->belongsTo(CodingAgentJob::class, 'coding_agent_job_id');
    }
}
