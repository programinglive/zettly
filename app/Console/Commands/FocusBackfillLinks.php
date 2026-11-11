<?php

namespace App\Console\Commands;

use App\Models\Focus;
use App\Models\Todo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Convert the legacy focus marker into a real foreign key.
 *
 * Before slice 1 the only link between a Todo and its focus was the HTML
 * comment `<!-- dev-workflow-focus:62 -->` appended to the description. This
 * command copies that link into `todos.focus_id` and leaves the marker text in
 * place, because deployed MCP builds still read it until they are upgraded.
 */
class FocusBackfillLinks extends Command
{
    protected $signature = 'focus:backfill-links
                            {--dry-run : Report what would change without writing anything}';

    protected $description = 'Backfill todos.focus_id from legacy dev-workflow focus markers';

    private const MARKER_PATTERN = '/<!--\s*dev-workflow-focus:(\d+)\s*-->/';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $counts = [
            'scanned' => 0,
            'linked' => 0,
            'already-linked' => 0,
            'missing-focus' => 0,
            'foreign-owner' => 0,
        ];

        // Soft-deleted todos are included on purpose: restoring a todo must keep
        // the focus it was worked under.
        Todo::withTrashed()
            ->whereNull('focus_id')
            ->where('description', 'like', '%dev-workflow-focus:%')
            ->orderBy('id')
            ->chunkById(200, function ($todos) use (&$counts, $dryRun) {
                foreach ($todos as $todo) {
                    $counts['scanned']++;

                    if (! preg_match(self::MARKER_PATTERN, (string) $todo->description, $matches)) {
                        continue;
                    }

                    $focus = Focus::find((int) $matches[1]);

                    if (! $focus) {
                        $counts['missing-focus']++;

                        continue;
                    }

                    if ((int) $focus->user_id !== (int) $todo->user_id) {
                        $counts['foreign-owner']++;

                        continue;
                    }

                    if (! $dryRun) {
                        DB::table('todos')
                            ->where('id', $todo->id)
                            ->whereNull('focus_id')
                            ->update([
                                'focus_id' => $focus->id,
                                'updated_at' => now(),
                            ]);
                    }

                    $counts['linked']++;
                }
            });

        // Todos that already carry a link are reported, never overwritten.
        $counts['already-linked'] = Todo::withTrashed()
            ->whereNotNull('focus_id')
            ->where('description', 'like', '%dev-workflow-focus:%')
            ->count();

        foreach ($counts as $label => $value) {
            $this->line(sprintf('%-16s %d', $label, $value));
        }

        $this->line($dryRun ? 'Dry run: nothing was written.' : 'Backfill complete.');

        return self::SUCCESS;
    }
}
