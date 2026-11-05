<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class MergeUserAccounts extends Command
{
    protected $signature = 'zettly:merge-users {source : Account to retire} {target : Account to keep} {--apply} {--backup= : Verified private database backup path} {--password-stdin : Read the target password from standard input}';

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
        foreach (Schema::getTables() as $item) {
            $table = $item['name'];
            $columns = array_column(Schema::getColumns($table), 'name');
            foreach (['user_id', 'created_by'] as $column) {
                if (in_array($column, $columns, true) && ! in_array($table, ['sessions', 'push_subscriptions'], true)) {
                    $count = DB::table($table)->where($column, $sourceId)->count();
                    if ($count) $movable[] = compact('table', 'column', 'count');
                }
            }
        }

        $this->line(json_encode(['source' => $sourceId, 'target' => $targetId, 'move' => $movable]));
        if (! $this->option('apply')) return self::SUCCESS;

        $backup = $this->option('backup');
        if (! is_string($backup) || ! is_file($backup) || filesize($backup) < 1024) {
            $this->error('A nonempty private database backup is required.');
            return self::FAILURE;
        }
        $password = $this->option('password-stdin') ? trim((string) fgets(STDIN)) : null;
        if (! $password || strlen($password) < 8) {
            $this->error('A target password of at least eight characters is required on standard input.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($sourceId, $targetId, $movable, $password, $source, $target) {
            User::query()->whereKey($sourceId)->lockForUpdate()->firstOrFail();
            User::query()->whereKey($targetId)->lockForUpdate()->firstOrFail();
            if (DB::table('tags as a')->join('tags as b', 'a.name', '=', 'b.name')
                ->where('a.user_id', $sourceId)->where('b.user_id', $targetId)->exists()) {
                throw new RuntimeException('Tag names collide; resolve the names before merging.');
            }
            $active = DB::table('foci')->where('user_id', $sourceId)->whereNull('completed_at')->pluck('id');
            if ($active->count() > 1) throw new RuntimeException('Source account has multiple active foci.');
            foreach ($active as $focusId) {
                DB::table('foci')->where('id', $focusId)->update(['completed_at' => now(), 'updated_at' => now()]);
                DB::table('focus_status_events')->insert([
                    'focus_id' => $focusId, 'user_id' => $sourceId, 'action' => 'completed',
                    'reason' => 'Account consolidation into owner '.$targetId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            foreach ($movable as $row) {
                DB::table($row['table'])->where($row['column'], $sourceId)->update([$row['column'] => $targetId]);
            }
            DB::table('sessions')->where('user_id', $sourceId)->delete();
            DB::table('push_subscriptions')->where('user_id', $sourceId)->delete();
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $sourceId)->delete();
            DB::table('password_reset_tokens')->where('email', $source->email)->delete();
            $target->forceFill(['password' => Hash::make($password)])->save();
            $source->delete();
            foreach ($movable as $row) {
                if (DB::table($row['table'])->where($row['column'], $sourceId)->exists()) {
                    throw new RuntimeException('Source records remain in '.$row['table']);
                }
            }
        });
        $this->info('Account merge committed; verify target readback and source login rejection.');
        return self::SUCCESS;
    }
}
