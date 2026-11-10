<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CodingAgentSetupController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Agent/Setup', [
            'newToken' => $request->session()->pull('newAgentWorkerToken'),
            'agentEnabled' => (bool) config('coding_agent.enabled'),
        ]);
    }

    public function issueWorkerToken(Request $request): RedirectResponse
    {
        $token = DB::transaction(function () use ($request): string {
            $request->user()->tokens()->where('name', 'zettly-coding-worker')->delete();

            return $request->user()->createToken('zettly-coding-worker', ['coding-agent:worker'])->plainTextToken;
        });

        return redirect()->route('agent.setup')->with('newAgentWorkerToken', $token);
    }
}
