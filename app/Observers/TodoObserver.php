<?php

namespace App\Observers;

use App\Models\Todo;
use App\Services\AlgoliaIndexer;
use App\Services\GraphSyncService;

class TodoObserver
{
    private AlgoliaIndexer $indexer;

    private GraphSyncService $graphSync;

    public function __construct(AlgoliaIndexer $indexer, GraphSyncService $graphSync)
    {
        $this->indexer = $indexer;
        $this->graphSync = $graphSync;
    }

    /**
     * Handle the Todo "created" event.
     */
    public function created(Todo $todo): void
    {
        $indexName = $this->getSearchIndex();

        if ($indexName) {
            $this->indexer->indexModel($todo, $indexName);
        }

        // Sync to graph service
        $this->graphSync->syncTodoToGraph($todo, 'node:add');
    }

    /**
     * Handle the Todo "updated" event.
     */
    public function updated(Todo $todo): void
    {
        $indexName = $this->getSearchIndex();

        if ($indexName) {
            $this->indexer->indexModel($todo, $indexName);
        }

        // Sync to graph service
        $this->graphSync->syncTodoToGraph($todo, 'node:update');
    }

    /**
     * Handle the Todo "deleted" event.
     */
    public function deleted(Todo $todo): void
    {
        $indexName = $this->getSearchIndex();

        if ($indexName) {
            $this->indexer->deleteModel($todo, $indexName);
        }

        // Sync to graph service
        $this->graphSync->deleteTodoFromGraph($todo->id);
    }

    private function getSearchIndex(): ?string
    {
        return config('scout.algolia.indices.search');
    }
}
