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
            'canProvisionCodingAgent' => $request->user()?->id === (int) config('coding_agent.owner_user_id')
                && $request->user()?->email === (string) config('coding_agent.owner_email')
                && $request->user()?->hasVerifiedEmail(),
            'canUseCodingAgent' => config('coding_agent.enabled')
                && $request->user()?->id === (int) config('coding_agent.owner_user_id')
                && $request->user()?->email === (string) config('coding_agent.owner_email')
                && $request->user()?->hasVerifiedEmail(),
            'csrf_token' => csrf_token(),
            'app' => [
                'version' => $this->resolveAppVersion(),
                'commit' => $this->resolveGitCommit(),
            ],
        ];
    }

    private function resolveAppVersion(): string
    {
        $packageJsonPath = base_path('package.json');
        if (is_file($packageJsonPath)) {
            $decoded = json_decode((string) file_get_contents($packageJsonPath), true);
            if (is_array($decoded) && !empty($decoded['version'])) {
                return (string) $decoded['version'];
            }
        }

        return (string) config('app.version', '0.0.0');
    }

    private function resolveGitCommit(): string
    {
        $headPath = base_path('.git/HEAD');
        if (!is_file($headPath)) {
            return 'unknown';
        }

        $head = trim((string) file_get_contents($headPath));
        if (str_starts_with($head, 'ref: ')) {
            $refPath = base_path('.git/' . trim(substr($head, 5)));
            if (is_file($refPath)) {
                return substr(trim((string) file_get_contents($refPath)), 0, 7);
            }
            $packedRefsPath = base_path('.git/packed-refs');
            $refName = trim(substr($head, 5));
            if (is_file($packedRefsPath)) {
                foreach (file($packedRefsPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                    if (!str_starts_with($line, '#') && str_ends_with($line, ' ' . $refName)) {
                        return substr(trim(explode(' ', $line)[0]), 0, 7);
                    }
                }
            }
        }

        return $head !== '' ? substr($head, 0, 7) : 'unknown';
    }
}
