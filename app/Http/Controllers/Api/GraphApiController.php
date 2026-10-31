<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;

class GraphApiController extends Controller
{
    public function export(): JsonResponse
    {
        $todos = Todo::query()->where('user_id', Auth::id())->whereNull('deleted_at')->with('relatedTodos:id')->get();
        $nodes = $todos->map(fn (Todo $todo) => [
            'id' => (string) $todo->id,
            'title' => $todo->title,
            'type' => $todo->type,
            'status' => $todo->archived ? 'archived' : ($todo->is_completed ? 'completed' : 'open'),
            'priority' => $todo->priority,
            'importance' => $todo->importance,
            'updated_at' => $todo->updated_at?->toIso8601String(),
        ]);
        $ids = $todos->pluck('id')->flip();
        $edges = $todos->flatMap(function (Todo $todo) use ($ids) {
            return $todo->relatedTodos->filter(fn (Todo $related) => isset($ids[$related->id]) && $todo->id < $related->id)
                ->map(fn (Todo $related) => ['source' => (string) $todo->id, 'target' => (string) $related->id]);
        })->values();

        return response()->json(['data' => ['nodes' => $nodes, 'edges' => $edges]]);
    }

    public function rebuild(): JsonResponse
    {
        $exitCode = Artisan::call('graph:sync');
        $output = Artisan::output();
        if ($exitCode !== 0) return response()->json(['message' => 'Graph rebuild failed.', 'output' => $output], 502);
        return response()->json(['success' => true, 'output' => $output]);
    }
}
