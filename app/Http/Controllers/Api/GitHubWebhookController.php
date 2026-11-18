<?php

namespace App\Http\Controllers\Api;

use App\Domain\Engineering\EngineeringCollectorService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GitHubWebhookController extends Controller
{
    public function handle(Request $request, EngineeringCollectorService $collector): JsonResponse
    {
        $secret = (string) config('services.github.webhook_secret', '');
        if ($secret !== '') {
            $signature = (string) $request->header('X-Hub-Signature-256', '');
            $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);
            if ($signature === '' || ! hash_equals($expected, $signature)) {
                return response()->json(['success' => false, 'message' => 'Invalid webhook signature.'], 401);
            }
        }

        $event = (string) $request->header('X-GitHub-Event', '');
        $deliveryId = (string) $request->header('X-GitHub-Delivery', '');
        $payload = $request->json()->all();

        $processed = $collector->ingestGitHubWebhook($event, $deliveryId, $payload);

        return response()->json([
            'success' => true,
            'processed' => $processed,
        ]);
    }
}
