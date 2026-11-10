<?php

namespace App\Support;

class CodingAgentRepositoryRegistry
{
    /**
     * Return all configured repositories normalized into structured metadata records.
     *
     * @return array<int, array{slug: string, name: string, remote: string, base: string, stack: string, checks: string}>
     */
    public static function all(): array
    {
        $raw = config('coding_agent.repositories', []);
        if (! is_array($raw)) {
            return [];
        }

        $normalized = [];
        foreach ($raw as $slug => $entry) {
            $slugStr = (string) $slug;
            if (is_string($entry)) {
                $normalized[] = [
                    'slug' => $slugStr,
                    'name' => $entry,
                    'remote' => $entry,
                    'base' => 'main',
                    'stack' => 'Laravel',
                    'checks' => '',
                ];

                continue;
            }

            if (is_array($entry)) {
                $remote = (string) ($entry['remote'] ?? $entry['repository'] ?? $slugStr);
                $normalized[] = [
                    'slug' => $slugStr,
                    'name' => (string) ($entry['name'] ?? $remote),
                    'remote' => $remote,
                    'base' => (string) ($entry['base'] ?? $entry['branch'] ?? 'main'),
                    'stack' => (string) ($entry['stack'] ?? 'Laravel'),
                    'checks' => (string) ($entry['checks'] ?? $entry['test_command'] ?? ''),
                ];
            }
        }

        return $normalized;
    }

    /**
     * Find a single normalized repository entry by slug.
     *
     * @return array{slug: string, name: string, remote: string, base: string, stack: string, checks: string}|null
     */
    public static function find(string $slug): ?array
    {
        foreach (self::all() as $repo) {
            if ($repo['slug'] === $slug) {
                return $repo;
            }
        }

        return null;
    }

    /**
     * Return the list of valid repository slugs.
     *
     * @return array<int, string>
     */
    public static function slugs(): array
    {
        return array_values(array_map(static fn (array $repo): string => $repo['slug'], self::all()));
    }
}
