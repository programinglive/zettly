<?php

namespace App\Console\Commands;

use App\Models\Todo;
use App\Services\ProjectClassifierService;
use Illuminate\Console\Command;

class ClassifyProjectsCommand extends Command
{
    protected $signature = 'zettly:classify-projects
                            {--apply : Persist canonical proyek:* tags and detach legacy/placeholder tags (default is dry-run)}
                            {--user= : Restrict to a specific user ID}
                            {--limit=2000 : Maximum number of todos to inspect}';

    protected $description = 'Classify tasks onto canonical Zettelkasten proyek:* tags and clean up placeholder/worktree aliases';

    public function handle(ProjectClassifierService $classifier): int
    {
        $apply = (bool) $this->option('apply');
        $dryRun = ! $apply;
        $userId = $this->option('user');
        $limit = max(1, (int) $this->option('limit'));

        $query = Todo::query()
            ->whereIn('type', [Todo::TYPE_TODO, Todo::TYPE_NOTE])
            ->where('archived', false)
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->with(['tags:id,name,color', 'focus:id,title'])
            ->orderByDesc('id')
            ->limit($limit);

        $stats = [
            'inspected' => 0,
            'updated' => 0,
            'unchanged' => 0,
            'unclassified' => 0,
        ];
        $byProject = [];

        foreach ($query->get() as $todo) {
            $stats['inspected']++;
            $res = $classifier->ensureCanonicalTagForTodo($todo, $dryRun);
            $stats[$res['status']]++;

            if ($res['canonical']) {
                $byProject[$res['canonical']] = ($byProject[$res['canonical']] ?? 0) + 1;
            }
        }

        arsort($byProject);

        $pruned = 0;
        if (! $dryRun) {
            $pruned = $classifier->pruneUnusedForbiddenTags($userId ? (int) $userId : null);
        }

        $mode = $dryRun ? 'DRY RUN' : 'APPLIED';
        $this->info(sprintf(
            '%s: inspected=%d updated=%d unchanged=%d unclassified=%d pruned_forbidden_tags=%d',
            $mode,
            $stats['inspected'],
            $stats['updated'],
            $stats['unchanged'],
            $stats['unclassified'],
            $pruned
        ));

        foreach ($byProject as $slug => $count) {
            $this->line(sprintf('  proyek:%s => %d', $slug, $count));
        }

        return self::SUCCESS;
    }
}
