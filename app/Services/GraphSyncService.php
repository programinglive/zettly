<?php

namespace App\Services;

use App\Jobs\SyncGraphEvent;
use App\Models\Todo;

class GraphSyncService
{
    /**
     * Sync a todo node to the graph service
     */
    public function syncTodoToGraph(Todo $todo, string $eventType = 'node:update'): void
    {
        $this->sendSyncEvent($eventType, [
            'id' => (string) $todo->id,
            'title' => $todo->title,
            'status' => $this->getTodoStatus($todo),
            'priority' => $todo->priority,
            'importance' => $todo->importance,
            'type' => $todo->type,
            'updatedAt' => $todo->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * Sync a link (edge) to the graph service
     */
    public function syncLinkToGraph(int $todoId, int $relatedTodoId): void
    {
        $this->sendSyncEvent('edge:add', [
            'source' => (string) $todoId,
            'target' => (string) $relatedTodoId,
        ]);
    }

    /**
     * Delete a todo node from the graph service
     */
    public function deleteTodoFromGraph(int $todoId): void
    {
        $this->sendSyncEvent('node:remove', ['id' => (string) $todoId]);
    }

    /**
     * Delete a link (edge) from the graph service
     */
    public function deleteLinkFromGraph(int $todoId, int $relatedTodoId): void
    {
        $this->sendSyncEvent('edge:remove', [
            'source' => (string) $todoId,
            'target' => (string) $relatedTodoId,
        ]);
    }

    /**
     * Send a sync event to the graph service.
     *
     * Queued rather than posted inline: the observer runs inside the request, and
     * a 2 s HTTP timeout there meant every todo write - and twice on link/unlink -
     * waited on a service that is decorative. Retries and failure logging now live
     * in SyncGraphEvent.
     */
    private function sendSyncEvent(string $type, array $data): void
    {
        SyncGraphEvent::dispatch($type, $data);
    }

    /**
     * Get the status of a todo for graph visualization
     */
    private function getTodoStatus(Todo $todo): string
    {
        if ($todo->archived) {
            return 'archived';
        }

        if ($todo->is_completed) {
            return 'completed';
        }

        return 'open';
    }
}