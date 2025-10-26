<?php

namespace App\Console\Commands;

use App\Models\Todo;
use App\Models\Tag;
use App\Services\AlgoliaIndexer;
use Illuminate\Console\Command;

class AlgoliaImport extends Command
{
    protected $signature = 'algolia:import {--clear : Clear indexes before importing}';

    protected $description = 'Import todos and tags into Algolia indexes';

    public function handle(): int
    {
        $indexer = new AlgoliaIndexer();

        $searchIndex = config('scout.algolia.indices.search');

        if (!$searchIndex) {
            $this->error('Algolia search index name not configured in config/scout.php');
            return 1;
        }

        if ($this->option('clear')) {
            $this->info('Clearing indexes...');
            $indexer->clearIndex($searchIndex);
        }

        // Import todos and notes into unified index
        $this->info('Importing todos and notes...');
        $todoCount = 0;
        Todo::query()
            ->with('tags')
            ->chunk(100, function ($todos) use ($indexer, $searchIndex, &$todoCount) {
                $indexer->bulkIndex($todos->toArray(), $searchIndex);
                $todoCount += count($todos);
                $this->line("  Indexed {$todoCount} todos/notes...");
            });

        $this->info("✓ Imported {$todoCount} todos/notes");

        // Import tags
        $this->info('Importing tags...');
        $tagCount = 0;
        Tag::query()
            ->chunk(100, function ($tags) use ($indexer, $searchIndex, &$tagCount) {
                $indexer->bulkIndex($tags->toArray(), $searchIndex);
                $tagCount += count($tags);
                $this->line("  Indexed {$tagCount} tags...");
            });

        $this->info("✓ Imported {$tagCount} tags");

        return 0;
    }
}
