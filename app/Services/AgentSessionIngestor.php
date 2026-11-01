<?php

namespace App\Services;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\User;
use Carbon\CarbonInterface;

class AgentSessionIngestor
{
    /**
     * Canonical secret pattern, ported verbatim from scripts/codex_journal.py.
     */
    public const SECRET_PATTERN = '#https://discord(?:app)?\.com/api/webhooks/\S+|bearer\s+\S+|(?:api[_-]?key|token|password|secret|webhook)\s*[:=]\s*\S+#i';

    /**
     * Category vocabulary, in match order, ported verbatim from scripts/codex_journal.py.
     *
     * @var array<int, array{0: string, 1: string}>
     */
    public const CATEGORIES = [
        ['Bug Fixing', '#(?i)\b(fix|bug|error|regression)\b#'],
        ['Testing', '#(?i)\b(test|validation|verify)\b#'],
        ['Debugging', '#(?i)\b(debug|trace|reproduce)\b#'],
        ['Documentation', '#(?i)\b(docs?|document|readme|guide)\b#'],
        ['Research', '#(?i)\b(research|compare|evaluate|inspect)\b#'],
        ['Planning', '#(?i)\b(plan|design|architecture)\b#'],
        ['Automation', '#(?i)\b(automation|scheduler|hook|workflow)\b#'],
        ['Deployment', '#(?i)\b(deploy|release|publish)\b#'],
        ['Maintenance', '#(?i)\b(maintain|upgrade|cleanup|update)\b#'],
    ];

    /**
     * Strip credentials, collapse whitespace, and truncate.
     */
    public static function redact(string $value, int $limit = 300): string
    {
        $redacted = preg_replace(self::SECRET_PATTERN, '[redacted]', $value) ?? $value;
        $collapsed = preg_replace('/[\r\n\t]+/', ' ', $redacted) ?? $redacted;

        return mb_substr(trim($collapsed), 0, $limit);
    }

    /**
     * Pick the first matching category, falling back to Development.
     */
    public static function categorize(string $text): string
    {
        foreach (self::CATEGORIES as [$name, $pattern]) {
            if (preg_match($pattern, $text) === 1) {
                return $name;
            }
        }

        return 'Development';
    }

    /**
     * Create or update a session, keyed by (user_id, session_id).
     */
    public function upsertSession(User $user, array $attributes, ?CarbonInterface $now = null): AgentSession
    {
        $title = self::redact((string) ($attributes['title'] ?? 'Codex work'), 180);

        $values = [
            'project' => self::redact((string) ($attributes['project'] ?? 'Workspace'), 80),
            'title' => $title,
            'category' => $attributes['category'] ?? self::categorize($title),
            'status' => $attributes['status'] ?? AgentSession::STATUS_IN_PROGRESS,
            'started_at' => $attributes['started_at'] ?? ($now ?? now()),
            'last_activity_at' => $attributes['last_activity_at'] ?? ($now ?? now()),
            'completed_at' => $attributes['completed_at'] ?? null,
            'duration_seconds' => (int) ($attributes['duration_seconds'] ?? 0),
            'files_changed' => $this->redactList($attributes['files_changed'] ?? null, 160),
            'errors' => $this->redactList($attributes['errors'] ?? null, 300),
            'outcome' => isset($attributes['outcome'])
                ? self::redact((string) $attributes['outcome'], 500)
                : null,
            'machine' => self::redact((string) ($attributes['machine'] ?? 'unknown'), 80),
        ];

        return AgentSession::updateOrCreate(
            [
                'user_id' => $user->id,
                'session_id' => (string) $attributes['session_id'],
            ],
            $values
        );
    }

    /**
     * Append one event, deduplicated by event_key. Returns null on a duplicate.
     */
    public function appendEvent(User $user, AgentSession $session, array $attributes, ?CarbonInterface $now = null): ?AgentEvent
    {
        $key = (string) $attributes['event_key'];

        if (AgentEvent::where('event_key', $key)->exists()) {
            return null;
        }

        return AgentEvent::create([
            'user_id' => $user->id,
            'agent_session_id' => $session->id,
            'event_key' => $key,
            'kind' => (string) $attributes['kind'],
            'occurred_at' => $attributes['occurred_at'] ?? ($now ?? now()),
            'detail' => isset($attributes['detail'])
                ? self::redact((string) $attributes['detail'], 300)
                : null,
        ]);
    }

    /**
     * Redact every element of a list, keeping null as null.
     *
     * @return array<int, string>|null
     */
    private function redactList(mixed $values, int $limit): ?array
    {
        if ($values === null) {
            return null;
        }

        return array_values(array_map(
            fn ($value) => self::redact((string) $value, $limit),
            (array) $values
        ));
    }
}
