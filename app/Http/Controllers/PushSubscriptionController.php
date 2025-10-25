<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    /**
     * Store or update a push subscription.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|url',
            'keys' => 'required|array',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string',
        ]);

        $user = Auth::user();

        PushSubscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint' => $validated['endpoint'],
            ],
            [
                'auth_token' => $validated['keys']['auth'],
                'p256dh_token' => $validated['keys']['p256dh'],
            ]
        );

        return response('Subscription saved', 201);
    }

    /**
     * Remove a push subscription.
     */
    public function destroy(Request $request): Response
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|url',
        ]);

        $user = Auth::user();

        PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response('Subscription removed', 200);
    }

    /**
     * Trigger a test push notification for the authenticated user.
     */
    public function test(Request $request, WebPushService $webPush): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:120',
            'body' => 'nullable|string|max:255',
            'url' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();

        $result = $webPush->sendToUser($user, [
            'title' => $validated['title'] ?? 'Zettly Notifications Enabled',
            'body' => $validated['body'] ?? 'Push notifications are working! Tap to return to your dashboard.',
            'url' => $validated['url'] ?? '/dashboard',
            'tag' => 'zettly-test',
        ]);

        if ($result['total'] === 0) {
            return response()->json([
                'message' => 'No active push subscriptions found for this user.',
            ], 404);
        }

        return response()->json([
            'message' => $result['sent']
                ? 'Test notification dispatched.'
                : 'Unable to deliver test notification to any subscription.',
            'result' => $result,
        ]);
    }
}
