<?php

namespace App\Http\Controllers;

use App\Models\CodingAgentJob;
use App\Services\CodingAgentApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CodingAgentApprovalController extends Controller
{
    public function __construct(private readonly CodingAgentApprovalService $approvals)
    {
    }

    public function store(Request $request, CodingAgentJob $job): RedirectResponse
    {
        $data = $request->validate([
            'commit_sha' => ['required', 'string', 'regex:/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/'],
            'target_environment' => ['required', 'string', 'in:development,staging,production'],
        ]);

        $this->approvals->approve(
            $job,
            $request->user()->id,
            $data['commit_sha'],
            $data['target_environment'],
        );

        return redirect()->route('agent.jobs.show', $job->id);
    }
}
