<?php

namespace App\Observers;

use App\Models\Tag;
use App\Services\AlgoliaIndexer;

class TagObserver
{
    private AlgoliaIndexer $indexer;

    public function __construct(AlgoliaIndexer $indexer)
    {
        $this->indexer = $indexer;
    }

    /**
     * Handle the Tag "created" event.
     */
    public function created(Tag $tag): void
    {
        $indexName = config('scout.algolia.indices.search');
        if ($indexName) {
            $this->indexer->indexModel($tag, $indexName);
        }
    }

    /**
     * Handle the Tag "updated" event.
     */
    public function updated(Tag $tag): void
    {
        $indexName = config('scout.algolia.indices.search');
        if ($indexName) {
            $this->indexer->indexModel($tag, $indexName);
        }
    }

    /**
     * Handle the Tag "deleted" event.
     */
    public function deleted(Tag $tag): void
    {
        $indexName = config('scout.algolia.indices.search');
        if ($indexName) {
            $this->indexer->deleteModel($tag, $indexName);
        }
    }
}
