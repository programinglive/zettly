<?php

namespace App\Observers;

use App\Models\Todo;
use App\Services\GraphSyncService;

class TodoObserver
{
    private GraphSyncService $graphSync;

    public function __construct(GraphSyncService $graphSync)
    {
        $this->graphSync = $graphSync;
    }

    /**
     * Handle the Todo "created" event.
     */
    public function created(Todo $todo): void
    {
        // Sync to graph service
        $this->graphSync->syncTodoToGraph($todo, 'node:add');
    }

    /**
     * Handle the Todo "updated" event.
     */
    public function updated(Todo $todo): void
    {
        // Sync to graph service
        $this->graphSync->syncTodoToGraph($todo, 'node:update');
    }

    /**
     * Handle the Todo "deleted" event.
     */
    public function deleted(Todo $todo): void
    {
        // Sync to graph service
        $this->graphSync->deleteTodoFromGraph($todo->id);
    }
}
