<?php

namespace App\Http\Controllers;

use App\Models\AgentSession;
use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Services\CodingAgentJobTransitions;
use App\Support\CodingAgentRepositoryRegistry;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CodingAgentJobController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $jobs = CodingAgentJob::query()->where('user_id', $userId)
            ->with('todo:id,title')->latest()->paginate(12)
            ->through(fn (CodingAgentJob $job) => [
                'id' => $job->id,
                'todo_id' => $job->todo_id,
                'todo_title' => $job->todo?->title,
                'repository' => $job->repository,
                'status' => $job->status,
                'branch' => $job->branch,
                'pr_url' => $job->pr_url,
                'tests_passed' => $job->tests_passed,
                'last_heartbeat_at' => $job->last_heartbeat_at?->toIso8601String(),
                'updated_at' => $job->updated_at?->toIso8601String(),
            ]);

        $todos = Todo::query()->where('user_id', $userId)
            ->whereNull('organization_id')->where('type', Todo::TYPE_TODO)
            ->where('is_completed', false)->orderBy('title')->limit(100)
            ->with(['checklistItems:id,todo_id,title,is_completed,position', 'tags:id,name'])
            ->get(['id', 'title', 'description', 'priority'])
            ->map(fn (Todo $todo) => [
                'id' => $todo->id,
                'title' => $todo->title,
                'description' => $todo->description,
                'priority' => $todo->priority,
                'checklist_items' => $todo->checklistItems->map(fn ($item) => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'is_completed' => (bool) $item->is_completed,
                ])->values()->all(),
                'tags' => $todo->tags->pluck('name')->values()->all(),
            ]);

        $repositoryRegistry = CodingAgentRepositoryRegistry::all();
        $selectedTodoId = $request->query('todo_id') ? (int) $request->query('todo_id') : null;

        $activeSessions = AgentSession::query()
            ->where('user_id', $userId)
            ->where('status', AgentSession::STATUS_IN_PROGRESS)
            ->orderByDesc('last_activity_at')
            ->limit(10)
            ->get(['session_id', 'project', 'title', 'machine', 'status', 'last_activity_at'])
            ->map(fn (AgentSession $s) => [
                'session_id' => $s->session_id,
                'project' => $s->project,
                'title' => $s->title,
                'machine' => $s->machine,
                'status' => $s->status,
                'last_activity_at' => $s->last_activity_at?->toIso8601String(),
            ])->values()->all();

        return Inertia::render('Agent/Index', [
            'jobs' => $jobs,
            'todos' => $todos,
            'selectedTodoId' => $selectedTodoId,
            'repositories' => CodingAgentRepositoryRegistry::slugs(),
            'repositoryRegistry' => $repositoryRegistry,
            'models' => config('coding_agent.models', ['qwen3-5-397b-a17b:free']),
            'default_model' => config('coding_agent.default_model', 'qwen3-5-397b-a17b:free'),
            'recap' => $this->buildEngineeringRecap($userId),
            'activeSessions' => $activeSessions,
        ]);
    }

    /**
     * Build Factory-equivalent Engineering Recap metrics (Today, Week, Month, All, 14-day strip, per-repo).
     *
     * @return array<string, mixed>
     */
    private function buildEngineeringRecap(int $userId): array
    {
        $tz = 'Asia/Jakarta';
        $nowJkt = CarbonImmutable::now($tz);
        $todayStartUtc = $nowJkt->startOfDay()->utc();
        $weekStartUtc = $nowJkt->startOfWeek()->utc();
        $monthStartUtc = $nowJkt->startOfMonth()->utc();
        $stripStartUtc = $nowJkt->subDays(13)->startOfDay()->utc();

        $allCompletedJobs = CodingAgentJob::query()
            ->where('user_id', $userId)
            ->where('status', 'completed')
            ->get(['id', 'repository', 'updated_at']);

        $todayCount = 0;
        $weekCount = 0;
        $monthCount = 0;
        $byDate = [];
        $byRepo = [];

        for ($i = 13; $i >= 0; $i--) {
            $dayKey = $nowJkt->subDays($i)->format('Y-m-d');
            $byDate[$dayKey] = 0;
        }

        foreach ($allCompletedJobs as $completedJob) {
            $updatedAt = $completedJob->updated_at
                ? CarbonImmutable::instance($completedJob->updated_at)
                : $nowJkt;

            if ($updatedAt->greaterThanOrEqualTo($todayStartUtc)) {
                $todayCount++;
            }
            if ($updatedAt->greaterThanOrEqualTo($weekStartUtc)) {
                $weekCount++;
            }
            if ($updatedAt->greaterThanOrEqualTo($monthStartUtc)) {
                $monthCount++;
            }
            if ($updatedAt->greaterThanOrEqualTo($stripStartUtc)) {
                $dayKey = $updatedAt->setTimezone($tz)->format('Y-m-d');
                if (array_key_exists($dayKey, $byDate)) {
                    $byDate[$dayKey]++;
                }
            }

            $repoKey = $completedJob->repository ?: 'unknown';
            $byRepo[$repoKey] = ($byRepo[$repoKey] ?? 0) + 1;
        }

        $dailyStrip = [];
        foreach ($byDate as $date => $count) {
            $dailyStrip[] = [
                'date' => $date,
                'label' => CarbonImmutable::createFromFormat('Y-m-d', $date, $tz)->format('d M'),
                'count' => $count,
            ];
        }

        $byRepository = [];
        foreach ($byRepo as $repo => $count) {
            $byRepository[] = [
                'repository' => $repo,
                'completed' => $count,
            ];
        }

        return [
            'today' => $todayCount,
            'week' => $weekCount,
            'month' => $monthCount,
            'all' => $allCompletedJobs->count(),
            'dailyStrip' => $dailyStrip,
            'byRepository' => $byRepository,
        ];
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
            'model' => ['nullable', 'string', Rule::in(config('coding_agent.models', ['qwen3-5-397b-a17b:free']))],
        ]);

        Todo::query()->whereKey($data['todo_id'])
            ->where('user_id', $request->user()->id)
            ->whereNull('organization_id')->firstOrFail();

        $model = $data['model'] ?? config('coding_agent.default_model', 'qwen3-5-397b-a17b:free');

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
