<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(name: 'push:test', description: 'Send a test web push notification to a user')]
class SendTestPushNotification extends Command
{
    /**
     * The console command signature.
     */
    protected $signature = 'push:test
        {user : The user ID or email address to send the notification to}
        {--title=Zettly Notifications Enabled : Override the notification title}
        {--body=Push notifications are working! Tap to return to your dashboard. : Override the notification body}
        {--url=/dashboard : URL to open when the notification is clicked}';

    public function __construct(private readonly WebPushService $webPush)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $identifier = $this->argument('user');
        $user = $this->resolveUser($identifier);

        if (! $user) {
            $this->error(sprintf('No user found for identifier "%s".', $identifier));

            return self::FAILURE;
        }

        $result = $this->webPush->sendToUser($user, [
            'title' => $this->option('title'),
            'body' => $this->option('body'),
            'url' => $this->option('url'),
            'tag' => 'zettly-test',
        ]);

        if ($result['total'] === 0) {
            $this->warn('The user has no active push subscriptions. Ask them to enable notifications first.');

            return self::SUCCESS;
        }

        if ($result['sent']) {
            $this->info(sprintf('Test notification queued for %d subscription(s).', $result['successes']));

            if (! empty($result['failures'])) {
                $this->warn(sprintf('However, %d subscription(s) failed:', count($result['failures'])));
                $this->displayFailures($result['failures']);
            }

            return self::SUCCESS;
        }

        $this->error('Unable to deliver the notification to any subscription. Review the failures below.');
        $this->displayFailures($result['failures']);

        return self::FAILURE;
    }

    protected function resolveUser(string $identifier): ?User
    {
        if (is_numeric($identifier)) {
            return User::find((int) $identifier);
        }

        return User::where('email', $identifier)->first();
    }

    /**
     * @param  array<int, array<string, mixed>>  $failures
     */
    protected function displayFailures(array $failures): void
    {
        foreach ($failures as $failure) {
            $this->line(sprintf('- [%s] %s', $failure['status'] ?? 'unknown', $failure['reason'] ?? 'Unknown error'));
        }
    }
}
