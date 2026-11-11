<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CodingAgentJob;
use App\Services\CodingAgentApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API persetujuan rilis untuk BOTOL (Discord).
 *
 * Halaman web memakai service yang sama, jadi aturan "commit dan environment
 * harus sama dengan yang ditinjau" tidak pernah berbeda antara web dan Discord.
 */
class CodingAgentApprovalApiController extends Controller
{
    public function __construct(private readonly CodingAgentApprovalService $approvals)
    {
    }

    /** Job yang menunggu keputusan rilis. */
    public function index(Request $request): JsonResponse
    {
        $jobs = CodingAgentJob::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('status', CodingAgentApprovalService::APPROVABLE_STATUSES)
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (CodingAgentJob $job) => [
                'id' => $job->id,
                'repository' => $job->repository,
                'branch' => $job->branch,
                'commit_sha' => $job->commit_sha,
                'target_environment' => $job->target_environment,
                'tests_passed' => (bool) $job->tests_passed,
                'test_summary' => $job->test_summary,
                'pr_url' => $job->pr_url,
                'status' => $job->status,
                'todo' => $job->todo?->title,
            ]);

        return response()->json(['data' => $jobs]);
    }

    public function approve(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'commit_sha' => ['required', 'string', 'regex:/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/'],
            'target_environment' => ['required', 'string', 'in:development,staging,production'],
        ]);

        $result = $this->approvals->approve(
            $job,
            $request->user()->id,
            $data['commit_sha'],
            $data['target_environment'],
        );

        return response()->json([
            'job' => $job->id,
            'result' => $result,
            'status' => $job->fresh()->status,
        ]);
    }

    public function reject(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:200'],
        ]);

        $this->approvals->reject($job, $request->user()->id, $data['reason'] ?? null);

        return response()->json([
            'job' => $job->id,
            'result' => 'rejected',
            'status' => $job->fresh()->status,
        ]);
    }
}
