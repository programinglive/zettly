<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodingAgentJobEvent extends Model
{
    protected $fillable = ['coding_agent_job_id', 'event_key', 'kind', 'detail', 'occurred_at'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(CodingAgentJob::class, 'coding_agent_job_id');
    }
}
