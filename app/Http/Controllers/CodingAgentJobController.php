<?php

namespace App\Http\Controllers;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Services\CodingAgentJobTransitions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class CodingAgentJobController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'todo_id' => ['required', 'integer'],
            'repository' => ['required', 'string', Rule::in(array_keys(config('coding_agent.repositories', [])))],
            'instruction' => ['required', 'string', 'max:5000'],
            'client_request_id' => ['required', 'string', 'max:100'],
        ]);

        Todo::query()->whereKey($data['todo_id'])
            ->where('user_id', $request->user()->id)
            ->whereNull('organization_id')->firstOrFail();

        $job = CodingAgentJob::firstOrCreate(
            ['user_id' => $request->user()->id, 'client_request_id' => $data['client_request_id']],
            ['todo_id' => $data['todo_id'], 'repository' => $data['repository'], 'instruction' => $data['instruction']]
        );
        abort_unless(
            $job->todo_id === $data['todo_id']
                && $job->repository === $data['repository']
                && $job->instruction === $data['instruction'],
            409,
            'This request ID belongs to a different job.'
        );

        return redirect()->route('todos.show', $job->todo_id);
    }

    public function instruction(Request $request, CodingAgentJob $job): RedirectResponse
    {
        $job = $this->ownedJob($request, $job);
        abort_unless(in_array($job->status, ['queued', 'running', 'needs_input', 'paused'], true), 409);
        $data = $request->validate(['instruction' => ['required', 'string', 'max:5000']]);
        $job->events()->create([
            'event_key' => (string) Str::uuid(),
            'kind' => 'instruction',
            'detail' => $data['instruction'],
            'occurred_at' => now(),
        ]);

        return redirect()->route('todos.show', $job->todo_id);
    }

    public function pause(Request $request, CodingAgentJob $job, CodingAgentJobTransitions $transitions): RedirectResponse
    {
        $job = $transitions->apply($this->ownedJob($request, $job), 'pause');

        return redirect()->route('todos.show', $job->todo_id);
    }

    public function cancel(Request $request, CodingAgentJob $job, CodingAgentJobTransitions $transitions): RedirectResponse
    {
        $job = $transitions->apply($this->ownedJob($request, $job), 'cancel');

        return redirect()->route('todos.show', $job->todo_id);
    }

    private function ownedJob(Request $request, CodingAgentJob $job): CodingAgentJob
    {
        return CodingAgentJob::query()->whereKey($job->id)
            ->where('user_id', $request->user()->id)->firstOrFail();
    }
}
