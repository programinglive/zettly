<?php

namespace App\Http\Controllers;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Services\CodingAgentJobTransitions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CodingAgentJobController extends Controller
{
    public function index(Request $request): Response
    {
        $jobs = CodingAgentJob::query()->where('user_id', $request->user()->id)
            ->with('todo:id,title')->latest()->paginate(12)
            ->through(fn (CodingAgentJob $job) => [
                'id' => $job->id,
                'todo_title' => $job->todo?->title,
                'repository' => $job->repository,
                'status' => $job->status,
                'updated_at' => $job->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('Agent/Index', [
            'jobs' => $jobs,
            'todos' => Todo::query()->where('user_id', $request->user()->id)
                ->whereNull('organization_id')->where('type', Todo::TYPE_TODO)
                ->where('is_completed', false)->orderBy('title')->limit(100)
                ->get(['id', 'title']),
            'repositories' => array_keys(config('coding_agent.repositories', [])),
            'models' => config('coding_agent.models', ['agnes-3-0-flash:free']),
            'default_model' => config('coding_agent.default_model', 'agnes-3-0-flash:free'),
        ]);
    }

    public function show(Request $request, CodingAgentJob $job): Response
    {
        $job = $this->ownedJob($request, $job)->load('todo:id,title');

        return Inertia::render('Agent/Show', [
            'job' => [
                'id' => $job->id,
                'todo_id' => $job->todo_id,
                'todo_title' => $job->todo?->title,
                'repository' => $job->repository,
                'instruction' => $job->instruction,
                'model' => $job->model,
                'status' => $job->status,
                'branch' => $job->branch,
                'commit_sha' => $job->commit_sha,
                'pr_url' => $job->pr_url,
                'test_summary' => $job->test_summary,
                'tests_passed' => $job->tests_passed,
                'target_environment' => $job->target_environment,
                'last_heartbeat_at' => $job->last_heartbeat_at?->toIso8601String(),
                'approved' => $job->hasCurrentApproval(),
            ],
            'events' => $job->events()->latest('occurred_at')->paginate(20, ['id', 'event_key', 'kind', 'detail', 'occurred_at']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'todo_id' => ['required', 'integer'],
            'repository' => ['required', 'string', Rule::in(array_keys(config('coding_agent.repositories', [])))],
            'instruction' => ['required', 'string', 'max:20000'],
            'client_request_id' => ['required', 'string', 'max:100'],
            'model' => ['nullable', 'string', Rule::in(config('coding_agent.models', ['agnes-3-0-flash:free']))],
        ]);

        Todo::query()->whereKey($data['todo_id'])
            ->where('user_id', $request->user()->id)
            ->whereNull('organization_id')->firstOrFail();

        $model = $data['model'] ?? config('coding_agent.default_model', 'agnes-3-0-flash:free');

        $job = CodingAgentJob::firstOrCreate(
            ['user_id' => $request->user()->id, 'client_request_id' => $data['client_request_id']],
            ['todo_id' => $data['todo_id'], 'repository' => $data['repository'], 'instruction' => $data['instruction'], 'model' => $model]
        );
        abort_unless(
            $job->todo_id === $data['todo_id']
                && $job->repository === $data['repository']
                && $job->instruction === $data['instruction'],
            409,
            'This request ID belongs to a different job.'
        );

        return redirect()->route('agent.jobs.show', $job->id);
    }

    public function instruction(Request $request, CodingAgentJob $job): RedirectResponse
    {
        $job = $this->ownedJob($request, $job);
        abort_unless(in_array($job->status, ['queued', 'running', 'needs_input', 'paused'], true), 409);
        $data = $request->validate(['instruction' => ['required', 'string', 'max:20000']]);
        $job->events()->create([
            'event_key' => (string) Str::uuid(),
            'kind' => 'instruction',
            'detail' => $data['instruction'],
            'occurred_at' => now(),
        ]);

        return redirect()->route('agent.jobs.show', $job->id);
    }

    public function pause(Request $request, CodingAgentJob $job, CodingAgentJobTransitions $transitions): RedirectResponse
    {
        $job = $transitions->apply($this->ownedJob($request, $job), 'pause');

        return redirect()->route('agent.jobs.show', $job->id);
    }

    public function resume(Request $request, CodingAgentJob $job, CodingAgentJobTransitions $transitions): RedirectResponse
    {
        $job = $transitions->apply($this->ownedJob($request, $job), 'resume');

        return redirect()->route('agent.jobs.show', $job->id);
    }

    public function cancel(Request $request, CodingAgentJob $job, CodingAgentJobTransitions $transitions): RedirectResponse
    {
        $job = $transitions->apply($this->ownedJob($request, $job), 'cancel');

        return redirect()->route('agent.jobs.show', $job->id);
    }

    private function ownedJob(Request $request, CodingAgentJob $job): CodingAgentJob
    {
        return CodingAgentJob::query()->whereKey($job->id)
            ->where('user_id', $request->user()->id)->firstOrFail();
    }
}
