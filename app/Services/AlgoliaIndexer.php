<?php

namespace App\Services;

use Algolia\AlgoliaSearch\Api\SearchClient;
use Illuminate\Database\Eloquent\Model;

class AlgoliaIndexer
{
    private ?SearchClient $client = null;

    public function __construct()
    {
        $appId = config('scout.algolia.id');
        $apiKey = config('scout.algolia.secret');

        if ($appId && $apiKey) {
            $this->client = SearchClient::create($appId, $apiKey);
        }
    }

    /**
     * Index a single model record.
     */
    public function indexModel(Model $model, string $indexName): void
    {
        if (! $this->client) {
            return;
        }

        $record = $this->transformModel($model);
        $this->client->saveObject($indexName, $record);
    }

    /**
     * Delete a model record from index.
     */
    public function deleteModel(Model $model, string $indexName, string $idField = 'id'): void
    {
        if (! $this->client) {
            return;
        }

        $this->client->deleteObject($indexName, (string) $model->{$idField});
    }

    /**
     * Bulk index models.
     */
    public function bulkIndex(iterable $models, string $indexName): void
    {
        if (! $this->client || empty($models)) {
            return;
        }

        $records = [];

        foreach ($models as $model) {
            if ($model instanceof Model) {
                $records[] = $this->transformModel($model);
            } elseif (is_array($model)) {
                $records[] = $this->transformArrayRecord($model);
            }
        }

        if (empty($records)) {
            return;
        }

        $this->client->saveObjects($indexName, $records);
    }

    /**
     * Clear an index.
     */
    public function clearIndex(string $indexName): void
    {
        if (! $this->client) {
            return;
        }

        $this->client->clearObjects($indexName);
    }

    /**
     * Transform a model into an Algolia record.
     */
    private function transformModel(Model $model): array
    {
        $modelClass = class_basename($model);

        return match ($modelClass) {
            'Todo' => $this->transformTodo($model),
            'Tag' => $this->transformTag($model),
            default => [
                'objectID' => (string) $model->id,
                'id' => $model->id,
                'user_id' => $model->user_id ?? null,
            ],
        };
    }

    private function transformArrayRecord(array $data): array
    {
        $type = $data['type'] ?? null;

        if ($type === 'note') {
            return [
                'objectID' => (string) ($data['id'] ?? ''),
                'id' => $data['id'] ?? null,
                'user_id' => $data['user_id'] ?? null,
                'title' => $data['title'] ?? null,
                'description' => strip_tags($data['description'] ?? ''),
                'type' => $type,
                'tags' => array_map(fn ($tag) => $tag['name'] ?? null, $data['tags'] ?? []),
                'url' => isset($data['id']) ? "/todos/{$data['id']}" : null,
            ];
        }

        return [
            'objectID' => (string) ($data['id'] ?? ''),
            'id' => $data['id'] ?? null,
            'user_id' => $data['user_id'] ?? null,
            'title' => $data['title'] ?? null,
            'description' => strip_tags($data['description'] ?? ''),
            'type' => $type,
            'priority' => $data['priority'] ?? null,
            'is_completed' => (bool) ($data['is_completed'] ?? false),
            'tags' => array_map(fn ($tag) => $tag['name'] ?? null, $data['tags'] ?? []),
            'url' => isset($data['id']) ? "/todos/{$data['id']}" : null,
        ];
    }

    /**
     * Transform a Todo model.
     */
    private function transformTodo(Model $todo): array
    {
        return [
            'objectID' => (string) $todo->id,
            'id' => $todo->id,
            'user_id' => $todo->user_id,
            'title' => $todo->title,
            'description' => strip_tags($todo->description ?? ''),
            'type' => $todo->type,
            'priority' => $todo->priority,
            'is_completed' => $todo->is_completed,
            'tags' => $todo->tags?->pluck('name')->toArray() ?? [],
            'url' => "/todos/{$todo->id}",
        ];
    }

    /**
     * Transform a Tag model.
     */
    private function transformTag(Model $tag): array
    {
        return [
            'objectID' => (string) $tag->id,
            'id' => $tag->id,
            'user_id' => $tag->user_id,
            'name' => $tag->name,
            'tag_id' => $tag->id,
            'url' => "/manage/tags?highlight={$tag->id}",
        ];
    }
}
