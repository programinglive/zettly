<?php

namespace App\Http\Controllers;

use App\Models\CodingAgentJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CodingAgentApprovalController extends Controller
{
    public function store(Request $request, CodingAgentJob $job): RedirectResponse
    {
        $data = $request->validate([
            'commit_sha' => ['required', 'string', 'regex:/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/'],
            'target_environment' => ['required', 'string', 'in:development,staging,production'],
        ]);

        DB::transaction(function () use ($request, $job, $data): void {
            $job = CodingAgentJob::query()->whereKey($job->id)
                ->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless(
                in_array($job->status, ['review', 'release_pending'], true)
                    && $job->tests_passed === true
                    && preg_match('/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/', (string) $job->commit_sha)
                    && hash_equals($job->commit_sha, $data['commit_sha'])
                    && $job->target_environment === $data['target_environment'],
                409,
                'The reviewed artifact changed or is not ready for approval.'
            );

            $approval = $job->approvals()->firstOrCreate(
                [
                    'repository' => $job->repository,
                    'target_environment' => $job->target_environment,
                    'commit_sha' => $job->commit_sha,
                ],
                ['approved_by' => $request->user()->id]
            );
            if ($approval->wasRecentlyCreated) {
                $job->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'release_approved',
                    'detail' => "{$job->target_environment}:{$job->commit_sha}",
                    'occurred_at' => now(),
                ]);
            }
            $job->update(['status' => 'release_pending']);
        });

        return redirect()->route('agent.jobs.show', $job->id);
    }
}
