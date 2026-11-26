<?php

namespace App\Services\Npm;

use App\Models\Todo;
use App\Models\TodoStatusEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * @zettly-code ZC-ZETTLY-NPM-UNPUBLISH-MONITOR-001
 *
 * @purpose Check whether npm Support (ticket #5040981) has unpublished the legacy package @programinglive/dev-workflow-mcp-server and leave visible Indonesian feedback on the tracking Todo after every check.
 *
 * @invariant The Todo is completed only when the legacy package returns HTTP 404 AND the canonical @programinglive/dev-workflow latest is healthy (>= 3.1.3); the original description is never overwritten, only one rolling log block is maintained.
 *
 * @tests tests/Feature/LegacyNpmUnpublishMonitorTest.php
 */
class LegacyNpmUnpublishMonitorService
{
    public const LEGACY_PACKAGE = '@programinglive/dev-workflow-mcp-server';

    public const CANONICAL_PACKAGE = '@programinglive/dev-workflow';

    public const LEGACY_URL = 'https://registry.npmjs.org/@programinglive%2Fdev-workflow-mcp-server';

    public const CANONICAL_URL = 'https://registry.npmjs.org/@programinglive/dev-workflow/latest';

    public const MIN_CANONICAL_VERSION = '3.1.3';

    public const TICKET = '#5040981';

    public const LOG_HEADER = '## Riwayat Pengecekan Otomatis npm';

    /** Keep the description readable: only the latest N check lines are retained. */
    public const MAX_LOG_LINES = 20;

    /**
     * @return array{status: string, todo_id: int, legacy_status: ?int, canonical_status: ?int, canonical_version: ?string, message: string}
     */
    public function check(int $todoId): array
    {
        $todo = Todo::find($todoId);
        if ($todo === null) {
            return $this->result('todo_not_found', $todoId, null, null, null, "Todo #{$todoId} tidak ditemukan.");
        }

        if ($todo->is_completed) {
            return $this->result('already_completed', $todoId, null, null, null, "Todo #{$todoId} sudah selesai; pengecekan dilewati.");
        }

        [$legacyStatus] = $this->probe(self::LEGACY_URL);
        [$canonicalStatus, $canonicalBody] = $this->probe(self::CANONICAL_URL);
        $canonicalVersion = is_array($canonicalBody) ? ($canonicalBody['version'] ?? null) : null;
        $canonicalHealthy = $canonicalStatus === 200
            && is_string($canonicalVersion)
            && version_compare($canonicalVersion, self::MIN_CANONICAL_VERSION, '>=');

        $now = CarbonImmutable::now('Asia/Jakarta');
        $stamp = $now->format('d M Y H:i').' WIB';
        $legacyLabel = $legacyStatus === null ? 'tidak terjangkau' : "HTTP {$legacyStatus}";
        $canonicalLabel = $canonicalHealthy
            ? "sehat (v{$canonicalVersion})"
            : ($canonicalStatus === null ? 'tidak terjangkau' : "TIDAK SEHAT (HTTP {$canonicalStatus}".($canonicalVersion ? ", v{$canonicalVersion}" : '').')');

        if ($legacyStatus === 404 && $canonicalHealthy) {
            $status = 'unpublished';
            $message = "[{$stamp}] ✅ npm Support ".self::TICKET.' sudah memproses penghapusan: '.self::LEGACY_PACKAGE." kini HTTP 404. Paket kanonik ".self::CANONICAL_PACKAGE." {$canonicalLabel}. Todo ditutup otomatis.";
        } elseif ($legacyStatus === 404) {
            $status = 'canonical_unhealthy';
            $message = "[{$stamp}] ⚠️ ".self::LEGACY_PACKAGE.' sudah HTTP 404, tetapi paket kanonik '.self::CANONICAL_PACKAGE." {$canonicalLabel}. Todo tetap terbuka sampai paket kanonik sehat.";
        } elseif ($legacyStatus === 200) {
            $status = 'waiting';
            $message = "[{$stamp}] ⏳ Belum ada balasan dari pihak npmjs (tiket ".self::TICKET.'). '.self::LEGACY_PACKAGE." masih terpublikasi ({$legacyLabel}). Paket kanonik ".self::CANONICAL_PACKAGE." {$canonicalLabel}. Pengecekan berikutnya otomatis dalam 6 jam.";
        } else {
            $status = 'registry_unreachable';
            $message = "[{$stamp}] ⚠️ Registry npm tidak memberi jawaban pasti untuk ".self::LEGACY_PACKAGE." ({$legacyLabel}). Status tiket ".self::TICKET.' belum bisa dipastikan; dicoba lagi dalam 6 jam.';
        }

        $this->recordFeedback($todo, $message, $status === 'unpublished');

        return $this->result($status, $todoId, $legacyStatus, $canonicalStatus, is_string($canonicalVersion) ? $canonicalVersion : null, $message);
    }

    /**
     * @return array{0: ?int, 1: mixed}
     */
    private function probe(string $url): array
    {
        try {
            $response = Http::acceptJson()->timeout(15)->get($url);

            return [$response->status(), $response->json()];
        } catch (Throwable) {
            return [null, null];
        }
    }

    private function recordFeedback(Todo $todo, string $message, bool $complete): void
    {
        $todo->description = $this->appendLog((string) $todo->description, $message);

        if ($complete) {
            $todo->is_completed = true;
            $todo->completed_at = now();
        }

        $todo->save();

        TodoStatusEvent::create([
            'todo_id' => $todo->id,
            'user_id' => $todo->user_id,
            'from_state' => 'pending',
            'to_state' => $complete ? 'completed' : 'pending',
            'reason' => mb_substr($message, 0, 1000),
        ]);
    }

    private function appendLog(string $description, string $line): string
    {
        $headerPos = strpos($description, self::LOG_HEADER);
        $base = $headerPos === false ? rtrim($description) : rtrim(substr($description, 0, $headerPos));
        $existing = $headerPos === false ? [] : array_values(array_filter(
            array_map('trim', explode("\n", substr($description, $headerPos + strlen(self::LOG_HEADER)))),
            fn (string $l) => str_starts_with($l, '- ')
        ));

        $existing[] = '- '.$line;
        $existing = array_slice($existing, -self::MAX_LOG_LINES);

        return trim($base."\n\n".self::LOG_HEADER."\n".implode("\n", $existing));
    }

    /**
     * @return array{status: string, todo_id: int, legacy_status: ?int, canonical_status: ?int, canonical_version: ?string, message: string}
     */
    private function result(string $status, int $todoId, ?int $legacy, ?int $canonical, ?string $version, string $message): array
    {
        return [
            'status' => $status,
            'todo_id' => $todoId,
            'legacy_status' => $legacy,
            'canonical_status' => $canonical,
            'canonical_version' => $version,
            'message' => $message,
        ];
    }
}
