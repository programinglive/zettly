<?php

namespace App\Observers;

use App\Models\Todo;
use App\Services\AlgoliaIndexer;

class TodoObserver
{
    private AlgoliaIndexer $indexer;

    public function __construct(AlgoliaIndexer $indexer)
    {
        $this->indexer = $indexer;
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
    }

    private function getSearchIndex(): ?string
    {
        return config('scout.algolia.indices.search');
    }
}
