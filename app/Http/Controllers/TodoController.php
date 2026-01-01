<?php

namespace App\Http\Controllers;

use App\Mail\NoteCreated;
use App\Mail\NoteDeleted;
use App\Mail\NoteUpdated;
use App\Mail\TodoCreated;
use App\Mail\TodoDeleted;
use App\Mail\TodoUpdated;
use App\Models\Tag;
use App\Models\Todo;
use App\Services\GraphSyncService;
use App\Models\TodoAttachment;
use App\Models\TodoChecklistItem;
use App\Models\TodoStatusEvent;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TodoController extends Controller
{
    /**
     * Display the Kanban board view.
     */
    public function board(Request $request)
    {
        $user = $request->user();

        $selectedTagIds = collect($request->input('tags', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $todosQuery = $user->todos()
            ->notArchived()
            ->tasks()
            ->with(['tags', 'relatedTodos', 'linkedByTodos', 'attachments'])
            ->orderBy('is_completed', 'asc')
            ->orderByRaw("CASE 
            WHEN priority = 'urgent' THEN 1 
            WHEN priority = 'not_urgent' THEN 2 
            ELSE 3 END")
            ->orderByRaw("CASE 
            WHEN importance = 'important' THEN 1 
            WHEN importance = 'not_important' THEN 2 
            ELSE 3 END");

        if (Todo::hasKanbanOrderColumn()) {
            $todosQuery->orderBy('kanban_order');
        }

        $todosQuery->orderBy('created_at', 'desc');

        if (! empty($selectedTagIds)) {
            $todosQuery->whereHas('tags', function ($query) use ($selectedTagIds) {
                $query->whereIn('tags.id', $selectedTagIds);
            });
        }

        $todos = $todosQuery->get();

        $todos->each(function (Todo $todo) {
            $todo->attachments->each(fn ($attachment) => $attachment->append(['url', 'thumbnail_url']));
        });

        $availableTags = $user->tags()
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        return Inertia::render('Todos/Board', [
            'todos' => $todos,
            'filters' => [
                'tags' => $selectedTagIds,
            ],
            'availableTags' => $availableTags,
            'preferences' => [
                'workspace_view' => $user->workspace_view ?? null,
            ],
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $requestedType = $request->get('type');
        if ($requestedType === Todo::TYPE_NOTE) {
            return redirect()->route('notes.index', $request->query());
        }

        $query = Todo::where('user_id', Auth::id())
            ->notArchived()
            ->tasks()
            ->with(['user', 'tags', 'relatedTodos', 'linkedByTodos']);

        if ($request->has('filter')) {
            switch ($request->filter) {
                case 'completed':
                    $query->completed();
                    break;
                case 'pending':
                    $query->pending();
                    break;
                case 'urgent':
                    $query->byPriority(Todo::PRIORITY_URGENT);
                    break;
                case 'not_urgent':
                    $query->byPriority(Todo::PRIORITY_NOT_URGENT);
                    break;
                case 'important':
                    $query->byImportance(Todo::IMPORTANCE_IMPORTANT);
                    break;
                case 'not_important':
                    $query->byImportance(Todo::IMPORTANCE_NOT_IMPORTANT);
                    break;
            }
        }

        if ($request->has('priority')) {
            $query->byPriority($request->priority);
        }

        if ($request->has('tag') && $request->tag) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag);
            });
        }

        $query->orderBy('is_completed', 'asc')
            ->orderByRaw("CASE 
                WHEN priority = 'urgent' THEN 1 
                WHEN priority = 'not_urgent' THEN 2 
                ELSE 3 END")
            ->orderByRaw("CASE 
                WHEN importance = 'important' THEN 1 
                WHEN importance = 'not_important' THEN 2 
                ELSE 3 END");

        if (Todo::hasKanbanOrderColumn()) {
            $query->orderBy('kanban_order');
        }

        $query->orderBy('created_at', 'desc');

        $todos = $query->paginate(20);

        $tags = Tag::forUser(Auth::id())->get();

        return Inertia::render('Todos/Index', [
            'todos' => $todos,
            'tags' => $tags,
            'selectedTag' => $request->get('tag'),
            'filter' => $request->get('filter'),
        ]);
    }

    public function notes(Request $request)
    {
        $query = Todo::where('user_id', Auth::id())
            ->notArchived()
            ->notes()
            ->with(['user', 'tags'])
            ->orderBy('created_at', 'desc');

        if ($request->has('tag') && $request->tag) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag);
            });
        }

        $notes = $query->paginate(20);

        $tags = Tag::forUser(Auth::id())->get();

        return Inertia::render('Notes/Index', [
            'notes' => $notes,
            'tags' => $tags,
            'selectedTag' => $request->get('tag'),
        ]);
    }

    /**
     * Show the form for creating a new todo.
     */
    public function create(Request $request)
    {
        $requestedType = $request->get('type');
        $type = in_array($requestedType, [Todo::TYPE_TODO, Todo::TYPE_NOTE], true)
            ? $requestedType
            : Todo::TYPE_TODO;

        $tags = Tag::forUser(Auth::id())->get();
        $todos = Todo::where('user_id', Auth::id())->latest()->get(['id', 'title', 'is_completed']);

        return Inertia::render('Todos/Create', [
            'tags' => $tags,
            'todos' => $todos,
            'defaultType' => $type,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, WebPushService $webPush)
    {
        if ($request->has('due_date')) {
            $request->merge([
                'due_date' => $request->input('due_date') === '' ? null : $request->input('due_date'),
            ]);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:not_urgent,urgent',
            'importance' => 'nullable|in:not_important,important',
            'due_date' => 'nullable|date',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
            'related_todo_ids' => 'nullable|array',
            'related_todo_ids.*' => 'exists:todos,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // 10MB max per file
            'checklist_items' => 'nullable|array',
            'checklist_items.*.title' => 'required|string|max:255',
            'checklist_items.*.is_completed' => 'nullable|boolean',
        ]);

        $validator->sometimes('due_date', 'after_or_equal:today', function ($input) {
            return isset($input->due_date) && $input->due_date !== '';
        });

        $validated = $validator->validate();

        $type = $validated['type'] ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        $checklistItems = $validated['checklist_items'] ?? [];
        unset($validated['checklist_items']);

        $validated['user_id'] = Auth::id();

        if ($type === Todo::TYPE_TODO) {
            $validated['priority'] = $validated['priority'] ?? Todo::PRIORITY_NOT_URGENT;
            $validated['importance'] = $validated['importance'] ?? Todo::IMPORTANCE_NOT_IMPORTANT;
        } else {
            $validated['priority'] = null;
            $validated['importance'] = null;
            $validated['due_date'] = null;
        }

        $todo = Todo::create($validated);

        // Handle checklist items
        if (! empty($checklistItems)) {
            foreach ($checklistItems as $index => $itemData) {
                $todo->checklistItems()->create([
                    'title' => $itemData['title'],
                    'is_completed' => (bool) ($itemData['is_completed'] ?? false),
                    'position' => $index,
                ]);
            }
        }

        // Handle tags
        if (isset($validated['tag_ids']) && ! empty($validated['tag_ids'])) {
            // Filter tags to ensure they belong to the authenticated user
            $userTagIds = Tag::whereIn('id', $validated['tag_ids'])
                ->where('user_id', Auth::id())
                ->pluck('id')
                ->toArray();

            $todo->tags()->attach($userTagIds);
        }

        // Handle related todos
        if (isset($validated['related_todo_ids']) && ! empty($validated['related_todo_ids'])) {
            // Filter todos to ensure they belong to the authenticated user
            $userTodoIds = Todo::whereIn('id', $validated['related_todo_ids'])
                ->where('user_id', Auth::id())
                ->pluck('id')
                ->toArray();

            $todo->relatedTodos()->attach($userTodoIds);
        }

        // Handle file attachments
        if ($request->hasFile('attachments')) {
            $disk = $this->attachmentDisk();

            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $fileSize = $file->getSize();

                // Generate unique filename
                $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
                $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                // Store the file
                Storage::disk($disk)->putFileAs(
                    "todos/{$todo->id}/attachments",
                    $file,
                    $fileName,
                    $this->fsWriteOptions($disk)
                );

                // Determine file type
                $type = TodoAttachment::determineType($mimeType);

                // Generate thumbnail for images
                $thumbnailPath = null;
                if ($type === 'image') {
                    $thumbnailPath = $this->generateThumbnail($file, $fileName, $todo->id, $disk);
                }

                // Create attachment record
                $todo->attachments()->create([
                    'original_name' => $originalName,
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'mime_type' => $mimeType,
                    'file_size' => $fileSize,
                    'type' => $type,
                    'thumbnail_path' => $thumbnailPath,
                ]);
            }
        }

        if ($type === Todo::TYPE_TODO) {
            try {
                $webPush->sendToUser(
                    $todo->user,
                    [
                        'title' => 'New todo created',
                        'body' => $todo->description
                            ? Str::limit(strip_tags($todo->description), 120)
                            : 'Open your dashboard to review it.',
                        'url' => route('todos.show', $todo),
                        'tag' => 'todo-created-'.$todo->id,
                    ]
                );
            } catch (\Throwable $exception) {
                report($exception);
            }

            try {
                if ($todo->user?->email) {
                    Mail::to($todo->user)->queue(new TodoCreated($todo->fresh('user')));
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        } elseif ($type === Todo::TYPE_NOTE) {
            try {
                if ($todo->user?->email) {
                    Mail::to($todo->user)->queue(new NoteCreated($todo->fresh('user')));
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return redirect()->route('dashboard')->with('success', 'Todo created successfully.');
    }

    /**
     * Display the specified todo.
     */
    public function show(Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== Auth::id()) {
            abort(403);
        }

        // Eager load related data including status events
        $todo->load([
            'tags',
            'relatedTodos',
            'linkedByTodos',
            'attachments',
            'checklistItems',
            'statusEvents.user',
        ]);

        // Get available todos for linking (exclude current todo and already linked todos)
        $linkedTodoIds = $todo->relatedTodos->pluck('id')
            ->merge($todo->linkedByTodos->pluck('id'))
            ->unique()
            ->toArray();

        $availableTodos = Todo::where('user_id', Auth::id())
            ->where('id', '!=', $todo->id)
            ->whereNotIn('id', $linkedTodoIds)
            ->latest()
            ->get();

        // Ensure attachments include computed url and thumbnail_url attributes
        $todo->attachments->each(function ($attachment) {
            $attachment->append(['url', 'thumbnail_url']);
        });

        $statusEvents = $todo->statusEvents
            ->sortByDesc('created_at')
            ->values()
            ->map(fn ($event) => [
                'id' => $event->id,
                'from_state' => $event->from_state,
                'to_state' => $event->to_state,
                'reason' => $event->reason,
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->name,
                ] : null,
                'created_at' => $event->created_at,
                'created_at_human' => optional($event->created_at)->diffForHumans(),
            ]);

        return Inertia::render('Todos/Show', [
            'todo' => $todo,
            'availableTodos' => $availableTodos,
            'isNote' => $todo->isNote(),
            'statusEvents' => $statusEvents,
        ]);
    }

    /**
     * Show the form for editing the specified todo.
     */
    public function edit(Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== Auth::id()) {
            abort(403);
        }

        $tags = Tag::forUser(Auth::id())->get();
        $todos = Todo::where('user_id', Auth::id())
            ->where('id', '!=', $todo->id)
            ->latest()
            ->get(['id', 'title', 'description', 'is_completed']);

        // Load existing relationships (both directions)
        $todo->load(['tags', 'relatedTodos', 'linkedByTodos', 'attachments', 'checklistItems']);

        // Ensure attachments include computed url and thumbnail_url attributes
        $todo->attachments->each(function ($attachment) {
            $attachment->append(['url', 'thumbnail_url']);
        });

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
        if ($request->has('due_date')) {
            $request->merge([
                'due_date' => $request->input('due_date') === '' ? null : $request->input('due_date'),
            ]);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:not_urgent,urgent',
            'importance' => 'nullable|in:not_important,important',
            'is_completed' => 'nullable|in:0,1,true,false',
            'due_date' => 'nullable|date',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
            'related_todo_ids' => 'nullable|array',
            'related_todo_ids.*' => 'exists:todos,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // 10MB max per file
            'checklist_items' => 'nullable|array',
            'checklist_items.*.id' => 'nullable|exists:todo_checklist_items,id',
            'checklist_items.*.title' => 'required|string|max:255',
            'checklist_items.*.is_completed' => 'nullable|boolean',
        ]);

        $validator->sometimes('due_date', 'after_or_equal:today', function ($input) use ($todo) {
            if (! isset($input->due_date) || $input->due_date === '') {
                return false;
            }

            try {
                $candidate = Carbon::parse($input->due_date)->startOfDay();
            } catch (\Throwable $e) {
                return true;
            }

            if ($todo->due_date instanceof Carbon) {
                return ! $todo->due_date->isSameDay($candidate);
            }

            return true;
        });

        $validated = $validator->validate();

        $fromState = $todo->is_completed ? 'completed' : 'pending';
        $stateChanged = false;
        $reason = null;
        $toState = $fromState;

        $type = $validated['type'] ?? $todo->type ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        // Convert is_completed to boolean
        if (isset($validated['is_completed'])) {
            $validated['is_completed'] = in_array($validated['is_completed'], ['1', 1, true, 'true'], true);

            $toState = $validated['is_completed'] ? 'completed' : 'pending';
            if ($validated['is_completed'] !== $todo->is_completed) {
                $stateChanged = true;
                $reasonData = $request->validate([
                    'reason' => 'required|string|max:1000',
                ]);
                $reason = $reasonData['reason'];
            }
        }

        if (isset($validated['is_completed']) && $validated['is_completed']) {
            if (! $todo->is_completed) {
                $validated['completed_at'] = now();
            }

            $validated['priority'] = null;
            $validated['importance'] = null;
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        if ($type === Todo::TYPE_TODO && (! isset($validated['is_completed']) || ! $validated['is_completed'])) {
            $validated['priority'] = $validated['priority'] ?? ($todo->priority ?? Todo::PRIORITY_NOT_URGENT);
            $validated['importance'] = $validated['importance'] ?? ($todo->importance ?? Todo::IMPORTANCE_NOT_IMPORTANT);
        } elseif ($type === Todo::TYPE_NOTE) {
            $validated['priority'] = null;
            $validated['importance'] = null;
            $validated['due_date'] = null;
        }

        $checklistItems = $validated['checklist_items'] ?? null;
        unset($validated['checklist_items']);

        $todo->update($validated);

        // Sync tags
        $todo->tags()->sync($validated['tag_ids'] ?? []);

        // Sync related todos
        if (isset($validated['related_todo_ids'])) {
            // Filter todos to ensure they belong to the authenticated user
            $userTodoIds = Todo::whereIn('id', $validated['related_todo_ids'])
                ->where('user_id', Auth::id())
                ->pluck('id')
                ->toArray();

            $todo->relatedTodos()->sync($userTodoIds);
        }

        if ($checklistItems !== null) {
            $incomingItems = collect($checklistItems ?? []);
            $persistedIds = [];

            $incomingItems->each(function ($itemData, $index) use ($todo, &$persistedIds) {
                $attributes = [
                    'title' => $itemData['title'],
                    'is_completed' => (bool) ($itemData['is_completed'] ?? false),
                    'position' => $index,
                ];

                if (! empty($itemData['id'])) {
                    $item = $todo->checklistItems()->where('id', $itemData['id'])->first();
                    if ($item) {
                        $item->update($attributes);
                        $persistedIds[] = $item->id;

                        return;
                    }
                }

                $newItem = $todo->checklistItems()->create($attributes);
                $persistedIds[] = $newItem->id;
            });

            $todo->checklistItems()->whereNotIn('id', $persistedIds)->delete();
        }

        // Handle new file attachments
        if ($request->hasFile('attachments')) {
            $disk = $this->attachmentDisk();

            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $fileSize = $file->getSize();

                // Generate unique filename
                $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
                $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                // Store the file
                Storage::disk($disk)->putFileAs(
                    "todos/{$todo->id}/attachments",
                    $file,
                    $fileName,
                    $this->fsWriteOptions($disk)
                );

                // Determine file type
                $type = TodoAttachment::determineType($mimeType);

                // Generate thumbnail for images
                $thumbnailPath = null;
                if ($type === 'image') {
                    $thumbnailPath = $this->generateThumbnail($file, $fileName, $todo->id, $disk);
                }

                // Create attachment record
                $todo->attachments()->create([
                    'original_name' => $originalName,
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'mime_type' => $mimeType,
                    'file_size' => $fileSize,
                    'type' => $type,
                    'thumbnail_path' => $thumbnailPath,
                ]);
            }
        }

        $todo->refresh();
        $todo->loadMissing('user');

        if ($stateChanged && $reason !== null) {
            TodoStatusEvent::create([
                'todo_id' => $todo->id,
                'user_id' => Auth::id(),
                'from_state' => $fromState,
                'to_state' => $toState,
                'reason' => $reason,
            ]);
        }

        if ($todo->user?->email) {
            try {
                if ($todo->type === Todo::TYPE_TODO) {
                    Mail::to($todo->user)->queue(new TodoUpdated($todo));
                } elseif ($todo->type === Todo::TYPE_NOTE) {
                    Mail::to($todo->user)->queue(new NoteUpdated($todo));
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return redirect()->route('dashboard')->with('success', 'Todo updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Todo $todo)
    {
        if ($todo->user_id !== Auth::id()) {
            abort(403);
        }

        $todo->loadMissing('user');

        try {
            if ($todo->user?->email) {
                if ($todo->type === Todo::TYPE_TODO) {
                    Mail::to($todo->user)->queue(new TodoDeleted($todo));
                } elseif ($todo->type === Todo::TYPE_NOTE) {
                    Mail::to($todo->user)->queue(new NoteDeleted($todo));
                }
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

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
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $fromState = $todo->is_completed ? 'completed' : 'pending';
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
        $todo->refresh();

        TodoStatusEvent::create([
            'todo_id' => $todo->id,
            'user_id' => Auth::id(),
            'from_state' => $fromState,
            'to_state' => $isCompleted ? 'completed' : 'pending',
            'reason' => $validated['reason'],
        ]);

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo status updated successfully',
                'is_completed' => $todo->is_completed,
                'completed_at' => $todo->completed_at,
                'priority' => $todo->priority,
                'importance' => $todo->importance,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Todo status updated successfully!');
    }

    public function updatePriority(Request $request, Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        $validated = $request->validate([
            'priority' => 'nullable|in:not_urgent,urgent',
            'importance' => 'nullable|in:not_important,important',
            'is_completed' => 'boolean',
        ]);

        $fromState = $todo->is_completed ? 'completed' : 'pending';
        $isCompleted = array_key_exists('is_completed', $validated)
            ? (bool) $validated['is_completed']
            : $todo->is_completed;
        $toState = $isCompleted ? 'completed' : 'pending';
        $stateChanged = $isCompleted !== $todo->is_completed;
        $reason = null;

        if ($stateChanged) {
            $reason = Validator::make(
                $request->only('reason'),
                ['reason' => 'required|string|max:1000']
            )->validate()['reason'];
        }

        $priority = array_key_exists('priority', $validated)
            ? $validated['priority']
            : $todo->priority;

        $importance = array_key_exists('importance', $validated)
            ? $validated['importance']
            : $todo->importance;

        if ($isCompleted) {
            $priority = null;
            $importance = null;
        } else {
            $priority = $priority ?? Todo::PRIORITY_NOT_URGENT;
            $importance = $importance ?? Todo::IMPORTANCE_NOT_IMPORTANT;
        }

        $updateData = [
            'priority' => $priority,
            'importance' => $importance,
        ];

        if (array_key_exists('is_completed', $validated)) {
            $updateData['is_completed'] = $isCompleted;
            $updateData['completed_at'] = $isCompleted ? now() : null;
        }

        $todo->update($updateData);
        $todo->refresh();

        if ($stateChanged && $reason !== null) {
            TodoStatusEvent::create([
                'todo_id' => $todo->id,
                'user_id' => Auth::id(),
                'from_state' => $fromState,
                'to_state' => $toState,
                'reason' => $reason,
            ]);
        }

        // JSON for API, redirect for web/Inertia
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo priority updated successfully',
                'priority' => $todo->priority,
                'importance' => $todo->importance,
                'is_completed' => $todo->is_completed,
                'completed_at' => $todo->completed_at,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Todo priority updated successfully!');
    }

    public function reorder(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'column' => 'required|string|in:q1,q2,q3,q4,completed',
            'todo_ids' => 'required|array',
            'todo_ids.*' => 'integer',
        ]);

        $column = $validated['column'];
        $todoIds = collect($validated['todo_ids'])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();

        if (! Todo::hasKanbanOrderColumn()) {
            return $this->reorderResponse($request, [
                'ordered_count' => 0,
                'column' => $column,
            ]);
        }

        // Get all todos for the user that match the requested IDs
        $allUserTodos = $user->todos()
            ->tasks()
            ->notArchived()
            ->whereIn('id', $todoIds)
            ->get(['id']);

        if ($allUserTodos->isEmpty()) {
            return $this->reorderResponse($request);
        }

        // Filter to only the IDs that were requested and exist
        $validIds = $allUserTodos->pluck('id');
        $orderedIds = collect($todoIds)->filter(fn ($id) => $validIds->contains($id));

        if ($orderedIds->isEmpty()) {
            return $this->reorderResponse($request);
        }

        // For reorder, we only update the requested todos in the new column
        $finalOrder = $orderedIds->values();

        // Map column to todo properties
        $columnProps = [
            'q1' => ['importance' => Todo::IMPORTANCE_IMPORTANT, 'priority' => Todo::PRIORITY_URGENT, 'is_completed' => false],
            'q2' => ['importance' => Todo::IMPORTANCE_IMPORTANT, 'priority' => Todo::PRIORITY_NOT_URGENT, 'is_completed' => false],
            'q3' => ['importance' => Todo::IMPORTANCE_NOT_IMPORTANT, 'priority' => Todo::PRIORITY_URGENT, 'is_completed' => false],
            'q4' => ['importance' => Todo::IMPORTANCE_NOT_IMPORTANT, 'priority' => Todo::PRIORITY_NOT_URGENT, 'is_completed' => false],
            'completed' => ['is_completed' => true],
        ];

        $props = $columnProps[$column] ?? [];

        DB::transaction(function () use ($finalOrder, $props) {
            $now = now();

            $finalOrder->each(function ($id, $index) use ($now, $props) {
                $updateData = [
                    'kanban_order' => $index + 1,
                    'updated_at' => $now,
                ];

                // Merge in column-specific properties
                $updateData = array_merge($updateData, $props);

                DB::table('todos')
                    ->where('id', $id)
                    ->update($updateData);
            });
        });

        return $this->reorderResponse($request, [
            'ordered_count' => $finalOrder->count(),
            'column' => $column,
        ]);
    }

    public function toggleChecklistItem(Request $request, Todo $todo, TodoChecklistItem $checklistItem)
    {
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            abort(403);
        }

        if ($checklistItem->todo_id !== $todo->id) {
            abort(404);
        }

        $checklistItem->is_completed = ! $checklistItem->is_completed;
        $checklistItem->save();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Checklist item updated successfully',
                'id' => $checklistItem->id,
                'is_completed' => $checklistItem->is_completed,
            ]);
        }

        return redirect()->back()->with('success', 'Checklist item updated successfully!');
    }

    public function updateEisenhower(Request $request, Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            abort(403);
        }

        $validated = $request->validate([
            'priority' => 'required|in:not_urgent,urgent',
            'importance' => 'required|in:not_important,important',
        ]);

        if ($todo->type !== Todo::TYPE_TODO) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Eisenhower placement can only be changed for tasks.',
                ], 422);
            }

            return redirect()->back()
                ->with('error', 'Only task-type todos can use the Eisenhower matrix.');
        }

        if ($todo->is_completed) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Completed todos cannot be repositioned within the Eisenhower matrix.',
                ], 422);
            }

            return redirect()->back()
                ->with('error', 'Completed todos cannot be repositioned within the Eisenhower matrix.');
        }

        $todo->update($validated);
        $todo->refresh();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo Eisenhower placement updated successfully',
                'priority' => $todo->priority,
                'importance' => $todo->importance,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Todo Eisenhower placement updated successfully!');
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
        if ($todo->user_id !== Auth::id() || $relatedTodo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Create the relationship
        $todo->relatedTodos()->syncWithoutDetaching($validated['related_todo_id']);

        // Sync to graph service
        app(GraphSyncService::class)->syncLinkToGraph($todo->id, $validated['related_todo_id']);

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
        if ($todo->user_id !== Auth::id() || $relatedTodo->user_id !== Auth::id()) {
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

        // Sync to graph service
        app(GraphSyncService::class)->deleteLinkFromGraph($todo->id, $validated['related_todo_id']);

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
        $user = Auth::user();

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
            'priority' => null,
        ]);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => "Successfully archived {$completedCount} completed todos",
                'archived_count' => $completedCount,
            ]);
        }

        return redirect()->back()->with('success', "Successfully archived {$completedCount} completed todos");
    }

    public function archive(Request $request, Todo $todo)
    {
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            abort(403);
        }

        if ($todo->archived) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Todo already archived',
                    'todo' => $todo,
                ]);
            }

            return redirect()->back()->with('info', 'Todo already archived');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $todo->update([
            'archived' => true,
            'archived_at' => now(),
        ]);

        TodoStatusEvent::create([
            'todo_id' => $todo->id,
            'user_id' => Auth::id(),
            'from_state' => $todo->is_completed ? 'completed' : 'pending',
            'to_state' => 'archived',
            'reason' => $validated['reason'],
        ]);

        return redirect()->back()->with('success', 'Todo archived successfully!');
    }

    public function restore(Request $request, Todo $todo)
    {
        $this->authorizeTodo($todo);

        if (! $todo->archived) {
            return redirect()->back()->with('info', 'Todo is not archived.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $todo->update([
            'archived' => false,
            'archived_at' => null,
        ]);

        TodoStatusEvent::create([
            'todo_id' => $todo->id,
            'user_id' => Auth::id(),
            'from_state' => 'archived',
            'to_state' => $todo->is_completed ? 'completed' : 'pending',
            'reason' => $validated['reason'],
        ]);

        return redirect()->back()->with('success', 'Todo restored successfully!');
    }

    public function archived(Request $request)
    {
        $user = Auth::user();

        $archivedTodos = $user->todos()
            ->where('archived', true)
            ->orderByDesc('archived_at')
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Todos/Archived', [
            'todos' => $archivedTodos,
        ]);
    }

    private function authorizeTodo(Todo $todo): void
    {
        if ($todo->user_id !== Auth::id()) {
            abort(403);
        }
    }

    public function completed(Request $request)
    {
        $user = Auth::user();

        $completedTodos = $user->todos()
            ->completed()
            ->notArchived()
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderByDesc('completed_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Todos/Completed', [
            'todos' => $completedTodos,
        ]);
    }

    public function deleted(Request $request)
    {
        $user = Auth::user();

        $deletedTodos = $user->todos()
            ->onlyTrashed()
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderByDesc('deleted_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Todos/Deleted', [
            'todos' => $deletedTodos,
        ]);
    }

    public function restoreDeleted(Request $request, $todoId)
    {
        $user = Auth::user();

        /** @var Todo|null $todo */
        $todo = $user->todos()->onlyTrashed()->where('id', $todoId)->first();

        if (! $todo) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Todo not found or unauthorized'], 404);
            }

            return redirect()->back()->with('error', 'Todo not found or unauthorized');
        }

        $todo->restore();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Todo restored successfully',
                'todo' => $todo->fresh(),
            ]);
        }

        return redirect()->back()->with('success', 'Todo restored successfully!');
    }

    /**
            'todos' => $archivedTodos,
        ]);
    }

    /**
     * Upload attachment for a todo.
     */
    public function uploadAttachment(Request $request, Todo $todo)
    {
        // Ensure user owns the todo
        if ($todo->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $disk = $this->attachmentDisk();
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();

        // Generate unique filename
        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $filePath = "todos/{$todo->id}/attachments/{$fileName}";

        // Store the file
        Storage::disk($disk)->putFileAs(
            "todos/{$todo->id}/attachments",
            $file,
            $fileName,
            $this->fsWriteOptions($disk)
        );

        // Determine file type
        $type = TodoAttachment::determineType($mimeType);

        // Generate thumbnail for images
        $thumbnailPath = null;
        if ($type === 'image') {
            $thumbnailPath = $this->generateThumbnail($file, $fileName, $todo->id, $disk);
        }

        // Create attachment record
        $attachment = $todo->attachments()->create([
            'original_name' => $originalName,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'type' => $type,
            'thumbnail_path' => $thumbnailPath,
        ]);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'File uploaded successfully',
                'attachment' => $attachment->load('todo'),
            ]);
        }

        return redirect()->back()->with('success', 'File uploaded successfully');
    }

    /**
     * Delete an attachment.
     */
    public function deleteAttachment(TodoAttachment $attachment)
    {
        // Ensure user owns the todo
        if ($attachment->todo->user_id !== Auth::id()) {
            abort(403);
        }

        // Delete files from storage
        $disk = $this->attachmentDisk();

        if (Storage::disk($disk)->exists($attachment->file_path)) {
            Storage::disk($disk)->delete($attachment->file_path);
        }

        if ($attachment->thumbnail_path && Storage::disk($disk)->exists($attachment->thumbnail_path)) {
            Storage::disk($disk)->delete($attachment->thumbnail_path);
        }

        // Delete attachment record
        $attachment->delete();

        if (request()->wantsJson() || request()->is('api/*')) {
            return response()->json(['message' => 'Attachment deleted successfully']);
        }

        return back()->with('success', 'Attachment deleted successfully');
    }

    /**
     * Download an attachment.
     */
    public function downloadAttachment(TodoAttachment $attachment)
    {
        // Ensure user owns the todo
        if ($attachment->todo->user_id !== Auth::id()) {
            abort(403);
        }

        $disk = $this->attachmentDisk();

        if (! Storage::disk($disk)->exists($attachment->file_path)) {
            abort(404, 'File not found');
        }

        return Storage::disk($disk)->download($attachment->file_path, $attachment->original_name);
    }

    /**
     * Generate thumbnail for image files.
     */
    private function generateThumbnail(UploadedFile $file, string $fileName, int $todoId, string $disk): ?string
    {
        $temporaryThumbnail = null;
        try {
            $thumbnailFileName = 'thumb_'.$fileName;
            $thumbnailPath = "todos/{$todoId}/thumbnails/{$thumbnailFileName}";
            $temporaryThumbnail = tempnam(sys_get_temp_dir(), 'todo-thumb-');

            if ($temporaryThumbnail === false) {
                return null;
            }

            // Create thumbnail using intervention/image if available, otherwise use basic PHP
            $imageClass = 'Intervention\\Image\\ImageManagerStatic';
            if (class_exists($imageClass)) {
                $image = $imageClass::make($file->getRealPath());
                $image->fit(200, 200, function ($constraint) {
                    $constraint->upsize();
                });
                $image->save($temporaryThumbnail);
            } else {
                // Fallback to basic thumbnail generation
                $this->createBasicThumbnail($file->getRealPath(), $temporaryThumbnail);
            }

            if (! file_exists($temporaryThumbnail) || filesize($temporaryThumbnail) === 0) {
                return null;
            }

            Storage::disk($disk)->put(
                $thumbnailPath,
                file_get_contents($temporaryThumbnail),
                $this->fsWriteOptions($disk)
            );

            return $thumbnailPath;
        } catch (\Exception $e) {
            // If thumbnail generation fails, return null silently
            return null;
        } finally {
            if ($temporaryThumbnail && file_exists($temporaryThumbnail)) {
                @unlink($temporaryThumbnail);
            }
        }
    }

    /**
     * Basic thumbnail generation without intervention/image.
     */
    private function createBasicThumbnail(string $source, string $destination): void
    {
        $imageInfo = @getimagesize($source);
        if (! $imageInfo) {
            return;
        }

        $width = $imageInfo[0];
        $height = $imageInfo[1];
        $type = $imageInfo[2];

        // Calculate new dimensions
        $newWidth = 200;
        $newHeight = 200;

        if ($width > $height) {
            $newHeight = (int) (($height / $width) * $newWidth);
        } else {
            $newWidth = (int) (($width / $height) * $newHeight);
        }

        // Create image resource based on type
        $sourceImage = null;
        switch ($type) {
            case IMAGETYPE_JPEG:
                $sourceImage = @imagecreatefromjpeg($source);
                break;
            case IMAGETYPE_PNG:
                $sourceImage = @imagecreatefrompng($source);
                break;
            case IMAGETYPE_GIF:
                $sourceImage = @imagecreatefromgif($source);
                break;
            default:
                return;
        }

        if (! $sourceImage) {
            return;
        }

        // Create thumbnail
        $thumbnail = @imagecreatetruecolor($newWidth, $newHeight);
        if (! $thumbnail) {
            imagedestroy($sourceImage);

            return;
        }

        @imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Save thumbnail
        switch ($type) {
            case IMAGETYPE_JPEG:
                @imagejpeg($thumbnail, $destination, 85);
                break;
            case IMAGETYPE_PNG:
                @imagepng($thumbnail, $destination);
                break;
            case IMAGETYPE_GIF:
                @imagegif($thumbnail, $destination);
                break;
        }

        // Clean up
        imagedestroy($sourceImage);
        imagedestroy($thumbnail);
    }

    protected function getAttachmentDisk(): string
    {
        return config('filesystems.default');
    }

    protected function reorderResponse(Request $request, array $data = [])
    {
        // Reorder is always a JSON endpoint (called from Inertia frontend)
        return response()->json(array_merge([
            'message' => 'Todo order updated successfully',
        ], $data));
    }

    protected function applyKanbanColumnScope($query, string $column)
    {
        switch ($column) {
            case 'completed':
                return $query->where('is_completed', true);
            case 'q1':
                return $query->where('is_completed', false)
                    ->where('importance', Todo::IMPORTANCE_IMPORTANT)
                    ->where('priority', Todo::PRIORITY_URGENT);
            case 'q2':
                return $query->where('is_completed', false)
                    ->where('importance', Todo::IMPORTANCE_IMPORTANT)
                    ->where('priority', Todo::PRIORITY_NOT_URGENT);
            case 'q3':
                return $query->where('is_completed', false)
                    ->where('importance', Todo::IMPORTANCE_NOT_IMPORTANT)
                    ->where('priority', Todo::PRIORITY_URGENT);
            case 'q4':
            default:
                return $query->where('is_completed', false)
                    ->where('importance', Todo::IMPORTANCE_NOT_IMPORTANT)
                    ->where('priority', Todo::PRIORITY_NOT_URGENT);
        }
    }

    private function attachmentDisk(): string
    {
        return config('todo.attachments_disk', 'public');
    }

    private function fsWriteOptions(string $disk): array
    {
        // With GCS + Uniform Bucket-Level Access, per-object ACLs are not allowed.
        if ($disk === 'gcs') {
            return [];
        }

        return ['visibility' => $this->attachmentVisibility($disk)];
    }

    private function attachmentVisibility(string $disk): string
    {
        return config("filesystems.disks.{$disk}.visibility", 'public');
    }
}
