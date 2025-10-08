<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TodoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Todo::where('user_id', auth()->id())->notArchived()->with(['user', 'tags']);

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

        // Filter by tag
        if ($request->has('tag') && $request->tag) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag);
            });
        }

        $todos = $query->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderBy('is_completed', 'asc')
            ->orderByRaw("CASE 
                WHEN priority = 'urgent' THEN 1 
                WHEN priority = 'high' THEN 2 
                WHEN priority = 'medium' THEN 3 
                WHEN priority = 'low' THEN 4 
                ELSE 5 END")
            ->orderBy('created_at', 'desc')
            ->get();
        $tags = Tag::forUser(auth()->id())->get();

        return Inertia::render('Todos/Index', [
            'todos' => $todos,
            'tags' => $tags,
            'selectedTag' => $request->get('tag'),
        ]);
    }

    /**
     * Show the form for creating a new todo.
     */
    public function create()
    {
        $tags = Tag::forUser(auth()->id())->get();
        $todos = Todo::where('user_id', auth()->id())->latest()->get(['id', 'title', 'is_completed']);

        return Inertia::render('Todos/Create', [
            'tags' => $tags,
            'todos' => $todos,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
            'related_todo_ids' => 'nullable|array',
            'related_todo_ids.*' => 'exists:todos,id',
        ]);

        $validated['user_id'] = auth()->id();

        $todo = Todo::create($validated);

        // Handle tags
        if (isset($validated['tag_ids']) && ! empty($validated['tag_ids'])) {
            // Filter tags to ensure they belong to the authenticated user
            $userTagIds = Tag::whereIn('id', $validated['tag_ids'])
                ->where('user_id', auth()->id())
                ->pluck('id')
                ->toArray();

            $todo->tags()->attach($userTagIds);
        }

        // Handle related todos
        if (isset($validated['related_todo_ids']) && ! empty($validated['related_todo_ids'])) {
            // Filter todos to ensure they belong to the authenticated user
            $userTodoIds = Todo::whereIn('id', $validated['related_todo_ids'])
                ->where('user_id', auth()->id())
                ->pluck('id')
                ->toArray();

            $todo->relatedTodos()->attach($userTodoIds);
        }

        return redirect()->route('todos.index')
            ->with('success', 'Todo created successfully!');
    }

    /**
     * Display the specified todo.
     */
    public function show(Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== auth()->id()) {
            abort(403);
        }

        // Eager load related todos and tags
        $todo->load(['tags', 'relatedTodos', 'linkedByTodos']);

        // Get available todos for linking (exclude current todo and already linked todos)
        $linkedTodoIds = $todo->relatedTodos->pluck('id')
            ->merge($todo->linkedByTodos->pluck('id'))
            ->unique()
            ->toArray();

        $availableTodos = Todo::where('user_id', auth()->id())
            ->where('id', '!=', $todo->id)
            ->whereNotIn('id', $linkedTodoIds)
            ->latest()
            ->get();

        return Inertia::render('Todos/Show', [
            'todo' => $todo,
            'availableTodos' => $availableTodos,
        ]);
    }

    /**
     * Show the form for editing the specified todo.
     */
    public function edit(Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== auth()->id()) {
            abort(403);
        }

        $tags = Tag::forUser(auth()->id())->get();
        $todos = Todo::where('user_id', auth()->id())
            ->where('id', '!=', $todo->id)
            ->latest()
            ->get(['id', 'title', 'description', 'is_completed']);

        // Load existing relationships (both directions)
        $todo->load(['tags', 'relatedTodos', 'linkedByTodos']);

        // Build selected linked todos + ids for the form
        $selectedLinkedTodos = $todo->relatedTodos
            ->merge($todo->linkedByTodos)
            ->unique('id')
            ->values()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'description' => $t->description,
                    'is_completed' => (bool) $t->is_completed,
                ];
            });
        $linkedTodoIds = $selectedLinkedTodos->pluck('id');

        return Inertia::render('Todos/Edit', [
            'todo' => $todo,
            'tags' => $tags,
            'todos' => $todos,
            'linkedTodoIds' => $linkedTodoIds,
            'selectedLinkedTodos' => $selectedLinkedTodos,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Todo $todo)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_completed' => 'boolean',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
            'related_todo_ids' => 'nullable|array',
            'related_todo_ids.*' => 'exists:todos,id',
        ]);

        if (isset($validated['is_completed']) && $validated['is_completed'] && ! $todo->is_completed) {
            $validated['completed_at'] = now();
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        $todo->update($validated);

        // Sync tags
        $todo->tags()->sync($validated['tag_ids'] ?? []);

        // Sync related todos
        if (isset($validated['related_todo_ids'])) {
            // Filter todos to ensure they belong to the authenticated user
            $userTodoIds = Todo::whereIn('id', $validated['related_todo_ids'])
                ->where('user_id', auth()->id())
                ->pluck('id')
                ->toArray();

            $todo->relatedTodos()->sync($userTodoIds);
        }

        return redirect()->route('todos.index')
            ->with('success', 'Todo updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Todo $todo)
    {
        $todo->delete();

        return redirect()->route('todos.index')
            ->with('success', 'Todo deleted successfully!');
    }

    /**
     * Toggle the completion status of the specified todo.
     */
    public function toggle(Request $request, Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== auth()->id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        // Toggle completion status
        $isCompleted = ! $todo->is_completed;
        $completedAt = $isCompleted ? now() : null;

        $todo->update([
            'is_completed' => $isCompleted,
            'completed_at' => $completedAt,
        ]);

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo status updated successfully',
                'is_completed' => ! $todo->is_completed,
                'completed_at' => ! $todo->is_completed ? now() : null,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Todo status updated successfully!');
    }

    public function updatePriority(Request $request, Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== auth()->id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        $validated = $request->validate([
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_completed' => 'boolean',
        ]);

        $updateData = [];
        
        // Handle priority updates
        if (array_key_exists('priority', $validated)) {
            $updateData['priority'] = $validated['priority'];
        }
        
        if (isset($validated['is_completed'])) {
            $updateData['is_completed'] = $validated['is_completed'];
            $updateData['completed_at'] = $validated['is_completed'] ? now() : null;
            
            // When marking as completed, remove priority (set to null)
            if ($validated['is_completed']) {
                $updateData['priority'] = null;
            }
        }

        $todo->update($updateData);

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo priority updated successfully',
                'priority' => $updateData['priority'] ?? $todo->priority,
                'is_completed' => isset($validated['is_completed']) ? $validated['is_completed'] : $todo->is_completed,
                'completed_at' => isset($validated['is_completed']) ? ($validated['is_completed'] ? now() : null) : $todo->completed_at,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Todo priority updated successfully!');
    }

    /**
     * Link this todo to another todo.
     */
    public function link(Request $request, Todo $todo)
    {
        $validated = $request->validate([
            'related_todo_id' => 'required|exists:todos,id',
        ]);

        // Prevent self-linking
        if ($todo->id == $validated['related_todo_id']) {
            return response()->json(['message' => 'Cannot link todo to itself'], 422);
        }

        // Check if user owns both todos
        $relatedTodo = Todo::find($validated['related_todo_id']);
        if ($todo->user_id !== auth()->id() || $relatedTodo->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Create the relationship
        $todo->relatedTodos()->syncWithoutDetaching($validated['related_todo_id']);

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Todos linked successfully']);
        }

        return redirect()->back()->with('success', 'Todos linked successfully');
    }

    /**
     * Unlink this todo from another todo.
     */
    public function unlink(Request $request, Todo $todo)
    {
        $validated = $request->validate([
            'related_todo_id' => 'required|exists:todos,id',
        ]);

        // Check if user owns both todos
        $relatedTodo = Todo::find($validated['related_todo_id']);
        if ($todo->user_id !== auth()->id() || $relatedTodo->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Remove the relationship from both directions (force via DB to avoid relation cache issues)
        DB::table('todo_relationships')
            ->where('todo_id', $todo->id)
            ->where('related_todo_id', $validated['related_todo_id'])
            ->delete();

        DB::table('todo_relationships')
            ->where('todo_id', $validated['related_todo_id'])
            ->where('related_todo_id', $todo->id)
            ->delete();

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Todos unlinked successfully']);
        }

        return redirect()->back()->with('success', 'Todos unlinked successfully');
    }

    /**
     * Archive all completed todos for the authenticated user.
     */
    public function archiveCompleted(Request $request)
    {
        $user = auth()->user();
        
        // Get count of completed todos before archiving (exclude already archived)
        $completedCount = $user->todos()->completed()->notArchived()->count();
        
        if ($completedCount === 0) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'No completed todos to archive'], 200);
            }
            return redirect()->back()->with('info', 'No completed todos to archive');
        }
        
        // Archive all completed todos
        $user->todos()->completed()->notArchived()->update([
            'archived' => true,
            'archived_at' => now(),
        ]);
        
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => "Successfully archived {$completedCount} completed todos",
                'archived_count' => $completedCount
            ]);
        }
        
        return redirect()->back()->with('success', "Successfully archived {$completedCount} completed todos");
    }

    /**
     * Display archived todos.
     */
    public function archived(Request $request)
    {
        $archivedTodos = auth()->user()->todos()
            ->archived()
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderBy('archived_at', 'desc')
            ->get();

        return Inertia::render('Todos/Archived', [
            'todos' => $archivedTodos,
        ]);
    }
}
