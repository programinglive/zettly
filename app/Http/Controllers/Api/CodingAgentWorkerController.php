<?php

namespace App\Http\Controllers\Api;

use App\Models\CodingAgentJob;
use App\Services\AgentSessionIngestor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CodingAgentWorkerController
{
    private const LEASE_SECONDS = 120;

    public function claim(Request $request): JsonResponse
    {
        $claim = DB::transaction(function () use ($request): ?array {
            $job = CodingAgentJob::query()->where('user_id', $request->user()->id)
                ->where(function ($query) {
                    $query->where('status', 'queued')
                        ->orWhere(function ($expired) {
                            $expired->where('status', 'running')->where('leased_until', '<', now());
                        });
                })->orderBy('id')->lockForUpdate()->first();

            if (! $job) {
                return null;
            }

            $leaseToken = Str::random(64);
            $job->update([
                'status' => 'running',
                'lease_token_hash' => hash('sha256', $leaseToken),
                'leased_until' => now()->addSeconds(self::LEASE_SECONDS),
                'last_heartbeat_at' => now(),
            ]);

            return [
                'id' => $job->id,
                'repository' => $job->repository,
                'instruction' => $job->instruction,
                'model' => $job->model ?? config('coding_agent.default_model', 'qwen3-5-397b-a17b:free'),
                'lease_token' => $leaseToken,
                'leased_until' => $job->leased_until->toIso8601String(),
            ];
        });

        return $claim ? response()->json(['data' => $claim]) : response()->json(null, 204);
    }

    public function heartbeat(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate(['lease_token' => ['required', 'string']]);
        $job = $this->leasedJob($request, $job, $data['lease_token']);
        $job->update([
            'last_heartbeat_at' => now(),
            'leased_until' => now()->addSeconds(self::LEASE_SECONDS),
        ]);

        return response()->json(['success' => true]);
    }

    public function event(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'lease_token' => ['required', 'string'],
            'event_key' => ['required', 'string', 'max:64'],
            'kind' => ['required', 'string', 'max:40'],
            'detail' => ['nullable', 'string', 'max:20000'],
            'occurred_at' => ['required', 'date'],
        ]);
        $job = $this->leasedJob($request, $job, $data['lease_token']);
        $job->events()->firstOrCreate(
            ['event_key' => $data['event_key']],
            [
                'kind' => $data['kind'],
                'detail' => isset($data['detail']) ? AgentSessionIngestor::redact($data['detail'], 2000) : null,
                'occurred_at' => $data['occurred_at'],
            ]
        );

        return response()->json(['success' => true]);
    }

    public function instructions(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'lease_token' => ['required', 'string'],
            'after_id' => ['sometimes', 'integer', 'min:0'],
        ]);
        $job = $this->leasedJob($request, $job, $data['lease_token']);
        $instructions = $job->events()->where('kind', 'instruction')
            ->where('id', '>', $data['after_id'] ?? 0)
            ->orderBy('id')->limit(50)->get(['id', 'detail', 'occurred_at']);

        return response()->json(['data' => $instructions]);
    }

    public function result(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'lease_token' => ['required', 'string'],
            'branch' => ['required', 'string', 'max:191'],
            'commit_sha' => ['required', 'string', 'regex:/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/'],
            'pr_url' => ['nullable', 'url', 'max:2048'],
            'test_summary' => ['required', 'string', 'max:2000'],
            'tests_passed' => ['required', 'boolean'],
            'target_environment' => ['required', 'string', 'in:development,staging,production'],
        ]);
        $job = $this->leasedJob($request, $job, $data['lease_token']);
        unset($data['lease_token']);
        $data['test_summary'] = AgentSessionIngestor::redact($data['test_summary'], 2000);
        $job->update([
            ...$data,
            'status' => $data['tests_passed'] ? 'review' : 'failed',
            'lease_token_hash' => null,
            'leased_until' => null,
        ]);

        return response()->json(['success' => true]);
    }

    public function fail(Request $request, CodingAgentJob $job): JsonResponse
    {
        $data = $request->validate([
            'lease_token' => ['required', 'string'],
            'summary' => ['required', 'string', 'max:2000'],
        ]);
        $job = $this->leasedJob($request, $job, $data['lease_token']);
        $job->update([
            'status' => 'failed',
            'test_summary' => AgentSessionIngestor::redact($data['summary'], 2000),
            'tests_passed' => false,
            'lease_token_hash' => null,
            'leased_until' => null,
        ]);

        return response()->json(['success' => true]);
    }

    private function leasedJob(Request $request, CodingAgentJob $job, string $leaseToken): CodingAgentJob
    {
        $job = CodingAgentJob::query()->whereKey($job->id)
            ->where('user_id', $request->user()->id)->firstOrFail();
        abort_unless(
            $job->status === 'running'
                && $job->leased_until?->isFuture()
                && is_string($job->lease_token_hash)
                && hash_equals($job->lease_token_hash, hash('sha256', $leaseToken)),
            409,
            'The job lease is no longer valid.'
        );

        return $job;
    }
}
