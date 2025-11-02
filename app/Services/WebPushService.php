<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use RuntimeException;

class WebPushService
{
    /**
     * Send a web push notification to all of the user's registered devices.
     *
     * @param  array{title?: string, body?: string, url?: string, icon?: string, tag?: string, data?: array<string, mixed>}  $notification
     * @return array{sent: bool, successes: int, failures: array<int, array<string, mixed>>, total: int}
     */
    public function sendToUser(User $user, array $notification): array
    {
        /** @var Collection<int, \App\Models\PushSubscription> $subscriptions */
        $subscriptions = $user->pushSubscriptions()->get();

        if ($subscriptions->isEmpty()) {
            return [
                'sent' => false,
                'successes' => 0,
                'failures' => [],
                'total' => 0,
            ];
        }

        $webPush = $this->buildClient();
        $payload = json_encode([
            'title' => $notification['title'] ?? config('app.name', 'Zettly'),
            'body' => $notification['body'] ?? '',
            'url' => $notification['url'] ?? '/',
            'icon' => $notification['icon'] ?? url('/android-chrome-192x192.png'),
            'tag' => $notification['tag'] ?? 'zettly',
            'data' => $notification['data'] ?? [],
        ], JSON_THROW_ON_ERROR);

        $endpointMap = [];

        foreach ($subscriptions as $subscription) {
            $endpointMap[$subscription->endpoint] = $subscription;

            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh_token,
                    'authToken' => $subscription->auth_token,
                ]),
                $payload
            );
        }

        $success = 0;
        $failures = [];

        foreach ($webPush->flush() as $report) {
            $endpoint = method_exists($report, 'getEndpoint')
                ? $report->getEndpoint()
                : (string) $report->getRequest()->getUri();

            if ($report->isSuccess()) {
                $success++;

                continue;
            }

            $statusCode = optional($report->getResponse())->getStatusCode();
            $reason = $report->getReason();

            $failures[] = [
                'endpoint' => $endpoint,
                'status' => $statusCode,
                'reason' => $reason,
            ];

            if (in_array($statusCode, [404, 410], true) && isset($endpointMap[$endpoint])) {
                $endpointMap[$endpoint]->delete();
            }
        }

        return [
            'sent' => $success > 0,
            'successes' => $success,
            'failures' => $failures,
            'total' => $subscriptions->count(),
        ];
    }

    protected function buildClient(): WebPush
    {
        $publicKey = config('app.vapid_public_key');
        $privateKey = config('app.vapid_private_key');

        if (blank($publicKey) || blank($privateKey)) {
            throw new RuntimeException('VAPID keys are missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
        }

        return new WebPush([
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ], [
            'TTL' => 60,
        ]);
    }
}
