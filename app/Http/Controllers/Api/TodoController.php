<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TodoController extends Controller
{
    /**
     * Display a listing of the user's todos.
     */
    public function index(Request $request): JsonResponse
    {
        $requestedType = $request->get('type');
        $type = in_array($requestedType, [Todo::TYPE_TODO, Todo::TYPE_NOTE], true)
            ? $requestedType
            : Todo::TYPE_TODO;

        $query = Todo::where('user_id', Auth::id());

        if ($type === Todo::TYPE_NOTE) {
            $query->notes();
        } else {
            $query->tasks();
        }

        if ($request->has('filter') && $type === Todo::TYPE_TODO) {
            switch ($request->filter) {
                case 'completed':
                    $query->completed();
                    break;
                case 'pending':
                    $query->pending();
                    break;
                case 'urgent':
                    $query->highPriority();
                    break;
                case 'not_urgent':
                    $query->lowPriority();
                    break;
                case 'important':
                    $query->byImportance(Todo::IMPORTANCE_IMPORTANT);
                    break;
                case 'not_important':
                    $query->byImportance(Todo::IMPORTANCE_NOT_IMPORTANT);
                    break;
            }
        }

        // Filter by specific priority if requested
        if ($request->has('priority') && $type === Todo::TYPE_TODO) {
            $query->byPriority($request->priority);
        }
        if ($request->has('importance') && $type === Todo::TYPE_TODO) {
            $query->byImportance($request->importance);
        }

        $todos = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $todos,
            'filter' => $request->get('filter'),
            'type' => $type,
        ]);
    }

    /**
     * Store a newly created todo.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:not_urgent,urgent',
            'importance' => 'nullable|in:not_important,important',
            'checklist_items' => 'nullable|array',
            'checklist_items.*.title' => 'required|string|max:255',
            'checklist_items.*.is_completed' => 'nullable|boolean',
        ]);

        $checklistItems = $validated['checklist_items'] ?? [];
        unset($validated['checklist_items']);

        $validated['user_id'] = Auth::id();

        $type = $validated['type'] ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        if ($type === Todo::TYPE_TODO) {
            $validated['priority'] = $validated['priority'] ?? Todo::PRIORITY_NOT_URGENT;
            $validated['importance'] = $validated['importance'] ?? Todo::IMPORTANCE_NOT_IMPORTANT;
        } else {
            $validated['priority'] = null;
            $validated['importance'] = null;
        }

        $todo = null;

        DB::transaction(function () use (&$todo, $validated, $checklistItems) {
            $todo = Todo::create($validated);

            if (! empty($checklistItems)) {
                foreach ($checklistItems as $index => $itemData) {
                    $todo->checklistItems()->create([
                        'title' => $itemData['title'],
                        'is_completed' => (bool) ($itemData['is_completed'] ?? false),
                        'position' => $index,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Todo created successfully!',
            'data' => $todo->load('checklistItems'),
        ], 201);
    }

    /**
     * Display the specified todo.
     */
    public function show(Todo $todo): JsonResponse
    {
        // Ensure the todo belongs to the authenticated user
        if ($todo->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $todo->load('user'),
        ]);
    }

    /**
     * Update the specified todo.
     */
    public function update(Request $request, Todo $todo): JsonResponse
    {
        // Ensure the todo belongs to the authenticated user
        if ($todo->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validated = $request->validate([
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:not_urgent,urgent',
            'importance' => 'nullable|in:not_important,important',
            'is_completed' => 'nullable|boolean',
            'checklist_items' => 'nullable|array',
            'checklist_items.*.id' => 'nullable|exists:todo_checklist_items,id',
            'checklist_items.*.title' => 'required|string|max:255',
            'checklist_items.*.is_completed' => 'nullable|boolean',
        ]);

        if (isset($validated['is_completed'])) {
            $validated['is_completed'] = (bool) $validated['is_completed'];
        }

        if (isset($validated['is_completed']) && $validated['is_completed'] && ! $todo->is_completed) {
            $validated['completed_at'] = now();
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        $type = $validated['type'] ?? $todo->type ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        $isCompleted = $validated['is_completed'] ?? $todo->is_completed;

        if ($isCompleted) {
            $validated['priority'] = null;
            $validated['importance'] = null;
        } elseif ($type === Todo::TYPE_TODO) {
            $validated['priority'] = $validated['priority'] ?? ($todo->priority ?? Todo::PRIORITY_NOT_URGENT);
            $validated['importance'] = $validated['importance'] ?? ($todo->importance ?? Todo::IMPORTANCE_NOT_IMPORTANT);
        } else {
            $validated['priority'] = null;
            $validated['importance'] = null;
        }

        $checklistItems = $validated['checklist_items'] ?? null;
        unset($validated['checklist_items']);

        DB::transaction(function () use ($todo, $validated, $checklistItems) {
            $todo->update($validated);

            if ($checklistItems !== null) {
                $incomingItems = collect($checklistItems);
                $persistedIds = [];

                $incomingItems->each(function ($itemData, $index) use ($todo, &$persistedIds) {
                    $attributes = [
                        'title' => $itemData['title'],
                        'is_completed' => (bool) ($itemData['is_completed'] ?? false),
                        'position' => $index,
                    ];

                    if (! empty($itemData['id'])) {
                        $existing = $todo->checklistItems()->where('id', $itemData['id'])->first();
                        if ($existing) {
                            $existing->update($attributes);
                            $persistedIds[] = $existing->id;

                            return;
                        }
                    }

                    $newItem = $todo->checklistItems()->create($attributes);
                    $persistedIds[] = $newItem->id;
                });

                $todo->checklistItems()->whereNotIn('id', $persistedIds)->delete();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Todo updated successfully!',
            'data' => $todo->fresh('checklistItems'),
        ]);
    }

    /**
     * Remove the specified todo.
     */
    public function destroy(Todo $todo): JsonResponse
    {
        // Ensure the todo belongs to the authenticated user
        if ($todo->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $todo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Todo deleted successfully!',
        ]);
    }

    /**
     * Toggle the completion status of a todo.
     */
    public function toggle(Todo $todo): JsonResponse
    {
        // Ensure the todo belongs to the authenticated user
        if ($todo->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $isCompleted = ! $todo->is_completed;

        $updateData = [
            'is_completed' => $isCompleted,
            'completed_at' => $isCompleted ? now() : null,
        ];

        if ($isCompleted) {
            $updateData['priority'] = null;
            $updateData['importance'] = null;
        } else {
            $updateData['priority'] = $todo->priority ?? Todo::PRIORITY_NOT_URGENT;
            $updateData['importance'] = $todo->importance ?? Todo::IMPORTANCE_NOT_IMPORTANT;
        }

        $todo->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Todo status updated!',
            'data' => $todo->fresh(),
        ]);
    }

    /**
     * Get available priority levels.
     */
    public function priorities(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Todo::getPriorityLevels(),
        ]);
    }
}
