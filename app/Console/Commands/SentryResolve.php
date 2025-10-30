<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use GuzzleHttp\Client;

class SentryResolve extends Command
{
    protected $signature = 'sentry:resolve {identifier* : One or more Sentry issue identifiers (e.g., POS-CLINIC-P)}';
    protected $description = 'Resolve Sentry issues via the Sentry API';

    public function __construct(private ?Client $client = null)
    {
        parent::__construct();
    }

    public function handle()
    {
        $token   = env('SENTRY_TOKEN');
        $org     = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');

        if (!$token || !$org || !$project) {
            $this->error('Set SENTRY_TOKEN, SENTRY_ORG, and SENTRY_PROJECT in the environment.');
            return 1;
        }

        $client = $this->client ?? new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers'  => ['Authorization' => "Bearer {$token}"],
        ]);

        foreach ($this->argument('identifier') as $identifier) {
            $this->info("Resolving issue {$identifier}...");

            try {
                $lookupResponse = $client->get("projects/{$org}/{$project}/issues/", [
                    'query' => [
                        'query' => $identifier,
                        'limit' => 1,
                        'shortIdLookup' => 1,
                    ],
                ]);

                $matchedIssues = json_decode($lookupResponse->getBody()->getContents(), true);

                if (empty($matchedIssues)) {
                    $this->warn("No matching issue found for identifier {$identifier}.");
                    continue;
                }

                $issueId = $this->resolveIssueId($matchedIssues[0]);

                if ($issueId === null) {
                    $this->error("Failed to determine numeric issue ID for {$identifier}.");
                    continue;
                }

                $client->request('PUT', "issues/{$issueId}/", [
                    'json' => ['status' => 'resolved'],
                ]);

                $this->info("Resolved issue {$identifier} (ID {$issueId}).");
            } catch (\Throwable $e) {
                $this->error("Failed to resolve {$identifier}: {$e->getMessage()}");
            }
        }

        $this->info('Done resolving issues.');
        return 0;
    }

    private function resolveIssueId(array $issue): ?string
    {
        $rawIssueId = $issue['id'] ?? null;

        if ($rawIssueId !== null) {
            $rawIssueId = (string) $rawIssueId;

            if ($rawIssueId !== '' && ctype_digit($rawIssueId)) {
                return $rawIssueId;
            }
        }

        if (!empty($issue['permalink'])) {
            $path = parse_url($issue['permalink'], PHP_URL_PATH);

            if (is_string($path)) {
                $segments = array_values(array_filter(explode('/', trim($path, '/'))));
                $maybeIssueId = end($segments) ?: false;

                if ($maybeIssueId && ctype_digit($maybeIssueId)) {
                    return $maybeIssueId;
                }
            }
        }

        return null;
    }
}
