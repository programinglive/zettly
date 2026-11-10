<?php

namespace App\Http\Middleware;

use Laravel\Sanctum\PersonalAccessToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCodingAgentWorker
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('coding_agent.enabled')) {
            abort(404);
        }

        $user = $request->user();
        $token = $user?->currentAccessToken();
        if (! $user || ! $token instanceof PersonalAccessToken
            || ! in_array('coding-agent:worker', $token->abilities, true)
            || $user->id !== (int) config('coding_agent.owner_user_id')
            || $user->email !== (string) config('coding_agent.owner_email')
            || ! $user->hasVerifiedEmail()) {
            abort(403);
        }

        return $next($request);
    }
}
