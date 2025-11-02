<?php

namespace App\Console\Commands;

use GuzzleHttp\Client;
use Illuminate\Console\Command;

class SentryPull extends Command
{
    protected $signature = 'sentry:pull 
        {--limit=25 : Number of issues}
        {--query=is:unresolved : Sentry search query}
        {--sort=freq : freq|new|priority|trend|user}';

    protected $description = 'Fetch Sentry issues and write SENTRY_TODO.md';

    public function handle()
    {
        $token = env('SENTRY_TOKEN');
        $org = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');

        if (! $token || ! $org || ! $project) {
            $this->error('Set SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT in .env');

            return 1;
        }

        $client = new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers' => ['Authorization' => "Bearer {$token}"],
        ]);

        $this->info('Fetching issues from Sentry...');

        $res = $client->get("projects/{$org}/{$project}/issues/", [
            'query' => [
                'query' => $this->option('query'),
                'limit' => (int) $this->option('limit'),
                'expand' => 'owners,stats',
                'shortIdLookup' => 1,
                'sort' => $this->option('sort'),
            ],
        ]);

        $issues = json_decode($res->getBody()->getContents(), true);
        $blocks = [];

        foreach ($issues as $issue) {
            $issueId = $issue['id'];
            $shortId = $issue['shortId'];
            $title = $issue['title'];
            $culprit = $issue['culprit'] ?? '';
            $lvl = $issue['level'] ?? 'error';
            $events = $issue['count'] ?? '0';
            $users = $issue['userCount'] ?? '0';
            $first = $issue['firstSeen'] ?? '';
            $last = $issue['lastSeen'] ?? '';
            $link = $issue['permalink'] ?? '';

            $blocks[] = <<<MD
### {$shortId} — {$title}
- Level: **{$lvl}** | Events: **{$events}** | Users: **{$users}**
- Culprit: `{$culprit}` 
- First/Last seen: {$first} → {$last}
- Suggested branch: `fix/{$shortId}` 
- Link: {$link}


MD;
        }

        $content = "# Sentry Fix Queue\n\n> Query: `{$this->option('query')}`, Sort: `{$this->option('sort')}`\n\n".implode("\n", $blocks);
        file_put_contents(base_path('SENTRY_TODO.md'), $content);

        $this->info('Wrote SENTRY_TODO.md');
        $this->info('Found '.count($issues).' issues to fix');

        return 0;
    }
}
