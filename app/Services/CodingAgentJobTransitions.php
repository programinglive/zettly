<?php

namespace App\Services;

use App\Models\CodingAgentJob;

class CodingAgentJobTransitions
{
    private const ALLOWED = [
        'queued' => ['pause' => 'paused', 'cancel' => 'cancelled'],
        'running' => ['pause' => 'paused', 'cancel' => 'cancelled'],
        'needs_input' => ['pause' => 'paused', 'cancel' => 'cancelled'],
        'paused' => ['resume' => 'queued', 'cancel' => 'cancelled'],
        'review' => ['cancel' => 'cancelled'],
    ];

    public function apply(CodingAgentJob $job, string $action): CodingAgentJob
    {
        $next = self::ALLOWED[$job->status][$action] ?? null;
        abort_if($next === null, 409, 'This job cannot perform that action.');
        $job->update([
            'status' => $next,
            'lease_token_hash' => null,
            'leased_until' => null,
        ]);

        return $job;
    }
}
