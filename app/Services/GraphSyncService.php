<?php

namespace App\Services;

use App\Models\Todo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GraphSyncService
{
    private string $graphServiceUrl;

    public function __construct()
    {
        $this->graphServiceUrl = config('services.graph.url', 'http://localhost:3001');
    }

    /**
     * Sync a todo node to the graph service
     */
    public function syncTodoToGraph(Todo $todo, string $eventType = 'node:update'): void
    {
        try {
            $nodeData = [
                'id' => (string) $todo->id,
                'title' => $todo->title,
                'status' => $this->getTodoStatus($todo),
                'priority' => $todo->priority,
                'importance' => $todo->importance,
                'type' => $todo->type,
                'updatedAt' => $todo->updated_at->toIso8601String(),
            ];

            $this->sendSyncEvent($eventType, $nodeData);
        } catch (\Exception $e) {
            Log::error('Failed to sync todo to graph service', [
                'todo_id' => $todo->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Sync a link (edge) to the graph service
     */
    public function syncLinkToGraph(int $todoId, int $relatedTodoId): void
    {
        try {
            $edgeData = [
                'source' => (string) $todoId,
                'target' => (string) $relatedTodoId,
            ];

            $this->sendSyncEvent('edge:add', $edgeData);
        } catch (\Exception $e) {
            Log::error('Failed to sync link to graph service', [
                'todo_id' => $todoId,
                'related_todo_id' => $relatedTodoId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Delete a todo node from the graph service
     */
    public function deleteTodoFromGraph(int $todoId): void
    {
        try {
            $this->sendSyncEvent('node:remove', ['id' => (string) $todoId]);
        } catch (\Exception $e) {
            Log::error('Failed to delete todo from graph service', [
                'todo_id' => $todoId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Delete a link (edge) from the graph service
     */
    public function deleteLinkFromGraph(int $todoId, int $relatedTodoId): void
    {
        try {
            $edgeData = [
                'source' => (string) $todoId,
                'target' => (string) $relatedTodoId,
            ];

            $this->sendSyncEvent('edge:remove', $edgeData);
        } catch (\Exception $e) {
            Log::error('Failed to delete link from graph service', [
                'todo_id' => $todoId,
                'related_todo_id' => $relatedTodoId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send a sync event to the graph service
     */
    private function sendSyncEvent(string $type, array $data): void
    {
        $response = Http::timeout(2)
            ->post("{$this->graphServiceUrl}/sync", [
                'type' => $type,
                'data' => $data,
            ]);

        if (! $response->successful()) {
            throw new \Exception("Graph service returned status {$response->status()}");
        }
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
