<?php

namespace App\Console\Commands;

use App\Models\Todo;
use App\Services\GraphSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncGraphCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'graph:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform initial bulk sync of todos and relationships to the graph service';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $graphServiceUrl = config('services.graph.url', 'http://localhost:3001');

        $this->info('Starting bulk sync to graph service...');

        // Fetch all todos
        $todos = Todo::with(['relatedTodos', 'linkedByTodos'])
            ->whereNull('deleted_at')
            ->get();

        $this->info("Found {$todos->count()} todos");

        // Prepare nodes
        $nodes = $todos->map(function (Todo $todo) {
            return [
                'id' => (string) $todo->id,
                'title' => $todo->title,
                'status' => $this->getTodoStatus($todo),
                'priority' => $todo->priority,
                'importance' => $todo->importance,
                'type' => $todo->type,
                'updatedAt' => $todo->updated_at->toIso8601String(),
            ];
        })->toArray();

        // Prepare edges
        $edges = [];
        $processedEdges = [];

        foreach ($todos as $todo) {
            foreach ($todo->relatedTodos as $related) {
                $edgeKey = min($todo->id, $related->id).'-'.max($todo->id, $related->id);

                if (! in_array($edgeKey, $processedEdges)) {
                    $edges[] = [
                        'source' => (string) $todo->id,
                        'target' => (string) $related->id,
                    ];
                    $processedEdges[] = $edgeKey;
                }
            }
        }

        $this->info('Found '.count($edges).' relationships');

        // Send bulk sync to graph service
        try {
            $response = Http::timeout(30)
                ->post("{$graphServiceUrl}/sync", [
                    'type' => 'bulk:sync',
                    'data' => [
                        'nodes' => $nodes,
                        'edges' => $edges,
                    ],
                ]);

            if ($response->successful()) {
                $this->info('✅ Bulk sync completed successfully!');

                return Command::SUCCESS;
            } else {
                $this->error("Graph service returned status {$response->status()}");

                return Command::FAILURE;
            }
        } catch (\Exception $e) {
            $this->error('Failed to sync to graph service: '.$e->getMessage());

            return Command::FAILURE;
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
