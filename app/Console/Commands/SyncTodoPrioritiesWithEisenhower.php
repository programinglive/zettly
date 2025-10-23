<?php

namespace App\Console\Commands;

use App\Models\Todo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncTodoPrioritiesWithEisenhower extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'todos:sync-eisenhower {--dry-run : Show the planned changes without updating records}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Normalize todo priority & importance values to the Eisenhower schema';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        $this->line(sprintf('Syncing todos%s…', $dryRun ? ' (dry run)' : ''));

        $updatedCount = 0;
        $totalExamined = 0;

        Todo::query()
            ->select(['id', 'type', 'priority', 'importance', 'is_completed'])
            ->orderBy('id')
            ->chunkById(500, function ($todos) use (&$updatedCount, &$totalExamined, $dryRun) {
                foreach ($todos as $todo) {
                    $totalExamined++;

                    if ($todo->type !== Todo::TYPE_TODO) {
                        continue;
                    }

                    if ($todo->is_completed) {
                        // Completed todos should keep priority/importance null.
                        if ($todo->priority !== null || $todo->importance !== null) {
                            $updatedCount += $this->persistChanges($todo->id, [
                                'priority' => null,
                                'importance' => null,
                            ], $dryRun);
                        }

                        continue;
                    }

                    $normalized = $this->normalizeTodoValues($todo->priority, $todo->importance);

                    $changes = [];
                    if ($normalized['priority'] !== $todo->priority) {
                        $changes['priority'] = $normalized['priority'];
                    }
                    if ($normalized['importance'] !== $todo->importance) {
                        $changes['importance'] = $normalized['importance'];
                    }

                    if (! empty($changes)) {
                        $updatedCount += $this->persistChanges($todo->id, $changes, $dryRun);
                    }
                }
            });

        $this->info(sprintf('Examined %d todos; updated %d %s.', $totalExamined, $updatedCount, $updatedCount === 1 ? 'record' : 'records'));

        if ($dryRun) {
            $this->comment('Dry run complete – no data was modified.');
        }

        return Command::SUCCESS;
    }

    /**
     * Determine normalized urgency/importance values.
     */
    protected function normalizeTodoValues(?string $priority, ?string $importance): array
    {
        $priority = $priority !== null ? strtolower($priority) : null;
        $importance = $importance !== null ? strtolower($importance) : null;

        $normalizedPriority = Todo::PRIORITY_NOT_URGENT;
        if (in_array($priority, ['urgent', Todo::PRIORITY_URGENT, 'high'], true)) {
            $normalizedPriority = Todo::PRIORITY_URGENT;
        }

        $normalizedImportance = Todo::IMPORTANCE_NOT_IMPORTANT;
        if (in_array($importance, ['important', Todo::IMPORTANCE_IMPORTANT, 'high'], true)) {
            $normalizedImportance = Todo::IMPORTANCE_IMPORTANT;
        }

        return [
            'priority' => $normalizedPriority,
            'importance' => $normalizedImportance,
        ];
    }

    /**
     * Persist the provided changes, respecting dry-run mode.
     */
    protected function persistChanges(int $todoId, array $changes, bool $dryRun): int
    {
        if ($dryRun) {
            $this->warn(sprintf('Would update todo #%d with: %s', $todoId, json_encode($changes)));

            return 0;
        }

        DB::table('todos')->where('id', $todoId)->update($changes + ['updated_at' => now()]);

        return 1;
    }
}
