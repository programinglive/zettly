<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Symfony\Component\Process\Process;

class MergeUserAccounts extends Command
{
    protected $signature = 'zettly:merge-users {source : Account to retire} {target : Account to keep} {--apply} {--backup-dir= : Private directory for a fresh database backup} {--password-stdin : Read the target password from standard input}';

    protected $description = 'Transfer account-owned records while preserving IDs and retire the source account';

    public function handle(): int
    {
        $sourceId = filter_var($this->argument('source'), FILTER_VALIDATE_INT);
        $targetId = filter_var($this->argument('target'), FILTER_VALIDATE_INT);
        if (! $sourceId || ! $targetId || $sourceId === $targetId) {
            $this->error('Distinct positive account IDs are required.');
            return self::FAILURE;
        }

        $source = User::find($sourceId);
        $target = User::find($targetId);
        if (! $source || ! $target) {
            $this->error('Both accounts must be active.');
            return self::FAILURE;
        }

        $movable = [];
        $ownership = [];
        foreach (Schema::getTables() as $item) {
            $table = $item['name'];
            $columns = array_column(Schema::getColumns($table), 'name');
            foreach (['user_id', 'created_by'] as $column) {
                if (in_array($column, $columns, true) && ! in_array($table, ['sessions', 'push_subscriptions'], true)) {
                    $ownership[] = compact('table', 'column');
                    $count = DB::table($table)->where($column, $sourceId)->count();
                    if ($count) $movable[] = compact('table', 'column', 'count');
                }
            }
        }

        $this->line(json_encode(['source' => $sourceId, 'target' => $targetId, 'move' => $movable]));
        if (! $this->option('apply')) return self::SUCCESS;

        $backup = $this->createBackup($this->option('backup-dir'));
        $this->line(json_encode(['backup' => $backup, 'sha256' => hash_file('sha256', $backup)]));
        $password = $this->option('password-stdin') ? trim((string) fgets(STDIN)) : null;
        if (! $password || strlen($password) < 8) {
            $this->error('A target password of at least eight characters is required on standard input.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($sourceId, $targetId, $ownership, $password, $source, $target) {
            User::query()->whereKey($sourceId)->lockForUpdate()->firstOrFail();
            User::query()->whereKey($targetId)->lockForUpdate()->firstOrFail();
            if (DB::table('tags as a')->join('tags as b', 'a.name', '=', 'b.name')
                ->where('a.user_id', $sourceId)->where('b.user_id', $targetId)->exists()) {
                throw new RuntimeException('Tag names collide; resolve the names before merging.');
            }
            // Several focuses may legitimately be active now, so they are all
            // closed rather than treated as a data conflict.
            $active = DB::table('foci')->where('user_id', $sourceId)->whereNull('completed_at')->pluck('id');
            foreach ($active as $focusId) {
                DB::table('foci')->where('id', $focusId)->update([
                    'completed_at' => now(),
                    'status' => 'completed',
                    'updated_at' => now(),
                ]);
                DB::table('focus_status_events')->insert([
                    'focus_id' => $focusId, 'user_id' => $targetId, 'action' => 'completed',
                    'reason' => 'Account consolidation into owner '.$targetId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            foreach ($ownership as $row) {
                DB::table($row['table'])->where($row['column'], $sourceId)->update([$row['column'] => $targetId]);
            }
            DB::table('sessions')->where('user_id', $sourceId)->delete();
            DB::table('push_subscriptions')->where('user_id', $sourceId)->delete();
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $sourceId)->delete();
            DB::table('password_reset_tokens')->where('email', $source->email)->delete();
            $target->forceFill(['password' => Hash::make($password)])->save();
            $source->delete();
            foreach ($ownership as $row) {
                if (DB::table($row['table'])->where($row['column'], $sourceId)->exists()) {
                    throw new RuntimeException('Source records remain in '.$row['table']);
                }
            }
        });
        $this->info('Account merge committed; verify target readback and source login rejection.');
        return self::SUCCESS;
    }

    private function createBackup(?string $directory): string
    {
        $path = is_string($directory) ? realpath($directory) : false;
        if (! $path || ! is_dir($path) || ! is_writable($path) || str_starts_with($path, base_path())) {
            throw new RuntimeException('A private writable backup directory outside the application is required.');
        }
        $connection = DB::connection()->getConfig();
        if (($connection['driver'] ?? null) !== 'pgsql') {
            throw new RuntimeException('Automatic backup currently supports PostgreSQL only.');
        }
        $databaseName = DB::selectOne('select current_database() as name')->name;
        if (! is_string($connection['database'] ?? null) || $connection['database'] !== $databaseName) {
            throw new RuntimeException('Resolved connection and live database name differ.');
        }
        $backup = tempnam($path, 'zettly-merge-');
        if (! $backup) throw new RuntimeException('Cannot create backup file.');
        chmod($backup, 0600);
        $file = fopen($backup, 'wb');
        $process = new Process([
            'pg_dump', '--format=custom', '--no-owner', '--no-acl',
            '--host='.$connection['host'], '--port='.($connection['port'] ?? 5432),
            '--username='.$connection['username'], '--dbname='.$connection['database'],
        ], null, ['PGPASSWORD' => $connection['password'] ?? '']);
        try {
            $process->start();
            foreach ($process as $type => $buffer) {
                if ($type === Process::OUT) fwrite($file, $buffer);
            }
            fclose($file);
            if (! $process->isSuccessful() || filesize($backup) < 1024 || file_get_contents($backup, false, null, 0, 5) !== 'PGDMP') {
                throw new RuntimeException('PostgreSQL backup failed verification.');
            }
            return $backup;
        } catch (\Throwable $error) {
            if (is_resource($file)) fclose($file);
            unlink($backup);
            throw $error;
        }
    }
}
