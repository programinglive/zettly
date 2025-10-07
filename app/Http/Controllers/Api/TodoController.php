<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TodoController extends Controller
{
    /**
     * Display a listing of the user's todos.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Todo::where('user_id', Auth::id());

        if ($request->has('filter')) {
            switch ($request->filter) {
                case 'completed':
                    $query->completed();
                    break;
                case 'pending':
                    $query->pending();
                    break;
                case 'high_priority':
                    $query->highPriority();
                    break;
                case 'low_priority':
                    $query->lowPriority();
                    break;
            }
        }

        // Filter by specific priority if requested
        if ($request->has('priority')) {
            $query->byPriority($request->priority);
        }

        $todos = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $todos,
            'filter' => $request->get('filter'),
        ]);
    }

    /**
     * Store a newly created todo.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        $validated['user_id'] = Auth::id();

        $todo = Todo::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Todo created successfully!',
            'data' => $todo,
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
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_completed' => 'boolean',
        ]);

        if (isset($validated['is_completed']) && $validated['is_completed'] && ! $todo->is_completed) {
            $validated['completed_at'] = now();
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        $todo->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Todo updated successfully!',
            'data' => $todo->fresh(),
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

        $todo->update([
            'is_completed' => ! $todo->is_completed,
            'completed_at' => ! $todo->is_completed ? now() : null,
        ]);

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
