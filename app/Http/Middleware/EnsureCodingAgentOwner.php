<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCodingAgentOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('coding_agent.enabled')) {
            abort(404);
        }

        $user = $request->user();
        $ownerId = (int) config('coding_agent.owner_user_id');
        $ownerEmail = (string) config('coding_agent.owner_email');

        if (! $user || $ownerId <= 0 || $ownerEmail === ''
            || $user->id !== $ownerId
            || $user->email !== $ownerEmail
            || ! $user->hasVerifiedEmail()) {
            abort(403);
        }

        return $next($request);
    }
}
