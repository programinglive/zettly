<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TodoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Todo::where('user_id', auth()->id())->with(['user', 'tags']);

        if ($request->has('filter')) {
            switch ($request->filter) {
                case 'completed':
                    $query->completed();
                    break;
                case 'pending':
                    $query->pending();
                    break;
            }
        }

        // Filter by tag
        if ($request->has('tag') && $request->tag) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag);
            });
        }

        $todos = $query->latest()->get();
        $tags = Tag::forUser(auth()->id())->get();

        return Inertia::render('Todos/Index', [
            'todos' => $todos,
            'tags' => $tags,
            'filter' => $request->get('filter'),
            'selectedTag' => $request->get('tag'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $users = User::all();
        $tags = Tag::forUser(auth()->id())->get();

        return Inertia::render('Todos/Create', [
            'users' => $users,
            'tags' => $tags,
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
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        $validated['user_id'] = auth()->id();

        $todo = Todo::create($validated);

        // Handle tags
        if (isset($validated['tag_ids']) && !empty($validated['tag_ids'])) {
            // Filter tags to ensure they belong to the authenticated user
            $userTagIds = Tag::whereIn('id', $validated['tag_ids'])
                ->where('user_id', auth()->id())
                ->pluck('id')
                ->toArray();
            
            $todo->tags()->attach($userTagIds);
        }

        return redirect()->route('todos.index')
            ->with('success', 'Todo created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Todo $todo)
    {
        return Inertia::render('Todos/Show', [
            'todo' => $todo->load(['user', 'tags']),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Todo $todo)
    {
        $tags = Tag::forUser(auth()->id())->get();
        $todo->load('tags');

        return Inertia::render('Todos/Edit', [
            'todo' => $todo,
            'tags' => $tags,
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
            'is_completed' => 'boolean',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        if (isset($validated['is_completed']) && $validated['is_completed'] && ! $todo->is_completed) {
            $validated['completed_at'] = now();
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        $todo->update($validated);

        // Sync tags
        $todo->tags()->sync($validated['tag_ids'] ?? []);

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
     * Toggle the completion status of a todo.
     */
    public function toggle(Todo $todo)
    {
        $todo->update([
            'is_completed' => ! $todo->is_completed,
            'completed_at' => ! $todo->is_completed ? now() : null,
        ]);

        return redirect()->route('todos.index')
            ->with('success', 'Todo status updated!');
    }
}
