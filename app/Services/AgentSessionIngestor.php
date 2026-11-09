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
     *
     * Only fields the caller actually supplied are written; omitted optional
     * fields (files_changed, errors, outcome, completed_at, duration_seconds)
     * are preserved from the existing row.
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
            'machine' => self::redact((string) ($attributes['machine'] ?? 'unknown'), 80),
        ];

        // First write wins: a later update (a Stop hook that resends its own
        // "now" as started_at) must not move the recorded start forward.
        $sessionId = (string) ($attributes['session_id'] ?? '');
        $existing = AgentSession::where('user_id', $user->id)->where('session_id', $sessionId)->first();
        if ($existing !== null && $existing->started_at !== null) {
            unset($values['started_at']);
        }

        // Optional fields: only included when the caller explicitly sent them,
        // so a subsequent upsert that omits them does not wipe the stored value.
        if (array_key_exists('duration_seconds', $attributes)) {
            $values['duration_seconds'] = (int) $attributes['duration_seconds'];
        }
        if (array_key_exists('completed_at', $attributes)) {
            $values['completed_at'] = $attributes['completed_at'];
        }
        if (array_key_exists('files_changed', $attributes)) {
            $values['files_changed'] = $this->redactList($attributes['files_changed'], 160);
        }
        if (array_key_exists('errors', $attributes)) {
            $values['errors'] = $this->redactList($attributes['errors'], 300);
        }
        if (array_key_exists('outcome', $attributes)) {
            $values['outcome'] = $attributes['outcome'] === null
                ? null
                : self::redact((string) $attributes['outcome'], 500);
        }

        $session = AgentSession::updateOrCreate(
            [
                'user_id' => $user->id,
                'session_id' => $sessionId,
            ],
            $values
        );

        $this->deriveDurationWhenAbsent($session);

        return $session;
    }

    /**
     * Fill duration_seconds from the timestamps when no positive value was
     * ever supplied: completed_at when present, otherwise last_activity_at,
     * clamped to zero so a clock skew can never yield a negative.
     */
    private function deriveDurationWhenAbsent(AgentSession $session): void
    {
        if ((int) $session->duration_seconds > 0 || $session->started_at === null) {
            return;
        }

        $end = $session->completed_at ?? $session->last_activity_at;
        if ($end === null) {
            return;
        }

        $seconds = (int) round($end->getTimestamp() - $session->started_at->getTimestamp());
        $session->duration_seconds = max(0, $seconds);
        $session->save();
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
