<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'preferences' => [
                'workspace_view' => $request->user()?->workspace_view,
            ],
            'canUseCodingAgent' => config('coding_agent.enabled')
                && $request->user()?->id === (int) config('coding_agent.owner_user_id')
                && $request->user()?->email === (string) config('coding_agent.owner_email')
                && $request->user()?->hasVerifiedEmail(),
            'csrf_token' => csrf_token(),
        ];
    }
}
