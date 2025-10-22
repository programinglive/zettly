<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\TodoAttachment;
use App\Models\TodoChecklistItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TodoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $requestedType = $request->get('type');
        $type = in_array($requestedType, [Todo::TYPE_TODO, Todo::TYPE_NOTE], true)
            ? $requestedType
            : Todo::TYPE_TODO;

        $query = Todo::where('user_id', Auth::id())
            ->notArchived()
            ->with(['user', 'tags', 'relatedTodos', 'linkedByTodos']);

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
                case 'high_priority':
                    $query->highPriority();
                    break;
                case 'low_priority':
                    $query->lowPriority();
                    break;
            }
        }

        if ($request->has('priority') && $type === Todo::TYPE_TODO) {
            $query->byPriority($request->priority);
        }

        if ($request->has('tag') && $request->tag) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag);
            });
        }

        if ($type === Todo::TYPE_TODO) {
            $query->orderBy('is_completed', 'asc')
                ->orderByRaw("CASE 
                WHEN priority = 'urgent' THEN 1 
                WHEN priority = 'high' THEN 2 
                WHEN priority = 'medium' THEN 3 
                WHEN priority = 'low' THEN 4 
                ELSE 5 END")
                ->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $todos = $query->paginate(20);

        $tags = Tag::forUser(Auth::id())->get();

        return Inertia::render('Todos/Index', [
            'todos' => $todos,
            'tags' => $tags,
            'selectedTag' => $request->get('tag'),
            'selectedType' => $type,
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
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

        $type = $validated['type'] ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        $checklistItems = $validated['checklist_items'] ?? [];
        unset($validated['checklist_items']);

        $validated['user_id'] = Auth::id();

        if ($type === Todo::TYPE_TODO) {
            $validated['priority'] = $validated['priority'] ?? Todo::PRIORITY_MEDIUM;
        } else {
            $validated['priority'] = null;
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
            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $fileSize = $file->getSize();

                // Generate unique filename
                $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
                $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                // Store the file
                Storage::disk('public')->put($filePath, file_get_contents($file));

                // Determine file type
                $type = TodoAttachment::determineType($mimeType);

                // Generate thumbnail for images
                $thumbnailPath = null;
                if ($type === 'image') {
                    $thumbnailPath = $this->generateThumbnail($filePath, $todo->id);
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

        return redirect()->route('todos.index')
            ->with('success', 'Todo created successfully!');
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

        // Eager load related todos, tags, and attachments
        $todo->load(['tags', 'relatedTodos', 'linkedByTodos', 'attachments', 'checklistItems']);

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

        return Inertia::render('Todos/Show', [
            'todo' => $todo,
            'availableTodos' => $availableTodos,
            'isNote' => $todo->isNote(),
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
            'type' => 'nullable|in:'.Todo::TYPE_TODO.','.Todo::TYPE_NOTE,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_completed' => 'nullable|in:0,1,true,false',
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

        $type = $validated['type'] ?? $todo->type ?? Todo::TYPE_TODO;
        $validated['type'] = $type;

        // Convert is_completed to boolean
        if (isset($validated['is_completed'])) {
            $validated['is_completed'] = in_array($validated['is_completed'], ['1', 1, true, 'true'], true);
        }

        if (isset($validated['is_completed']) && $validated['is_completed']) {
            if (! $todo->is_completed) {
                $validated['completed_at'] = now();
            }

            $validated['priority'] = null;
        } elseif (isset($validated['is_completed']) && ! $validated['is_completed']) {
            $validated['completed_at'] = null;
        }

        if ($type === Todo::TYPE_TODO && (! isset($validated['is_completed']) || ! $validated['is_completed'])) {
            $validated['priority'] = $validated['priority'] ?? ($todo->priority ?? Todo::PRIORITY_MEDIUM);
        } elseif ($type === Todo::TYPE_NOTE) {
            $validated['priority'] = null;
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
            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $fileSize = $file->getSize();

                // Generate unique filename
                $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
                $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                // Store the file
                Storage::disk('public')->put($filePath, file_get_contents($file));

                // Determine file type
                $type = TodoAttachment::determineType($mimeType);

                // Generate thumbnail for images
                $thumbnailPath = null;
                if ($type === 'image') {
                    $thumbnailPath = $this->generateThumbnail($filePath, $todo->id);
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
        if ($todo->user_id !== Auth::id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        // Toggle completion status
        $isCompleted = ! $todo->is_completed;
        $completedAt = $isCompleted ? now() : null;

        $updateData = [
            'is_completed' => $isCompleted,
            'completed_at' => $completedAt,
        ];

        if ($isCompleted) {
            $updateData['priority'] = null;
        }

        $todo->update($updateData);

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

    public function toggleChecklistItem(Request $request, Todo $todo, TodoChecklistItem $checklistItem)
    {
        if ($todo->user_id !== Auth::id() || $checklistItem->todo_id !== $todo->id) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            abort(403);
        }

        $checklistItem->update([
            'is_completed' => ! $checklistItem->is_completed,
        ]);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Checklist item updated successfully',
                'is_completed' => $checklistItem->is_completed,
            ]);
        }

        return redirect()->back();
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
        if ($todo->user_id !== Auth::id() || $relatedTodo->user_id !== Auth::id()) {
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

    /**
     * Display archived todos.
     */
    public function archived(Request $request)
    {
        $archivedTodos = Auth::user()->todos()
            ->archived()
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderBy('archived_at', 'desc')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Todos/Archived', [
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
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();

        // Generate unique filename
        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $filePath = "todos/{$todo->id}/attachments/{$fileName}";

        // Store the file
        Storage::disk('public')->put($filePath, file_get_contents($file));

        // Determine file type
        $type = TodoAttachment::determineType($mimeType);

        // Generate thumbnail for images
        $thumbnailPath = null;
        if ($type === 'image') {
            $thumbnailPath = $this->generateThumbnail($filePath, $todo->id);
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
        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        if ($attachment->thumbnail_path && Storage::disk('public')->exists($attachment->thumbnail_path)) {
            Storage::disk('public')->delete($attachment->thumbnail_path);
        }

        // Delete attachment record
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
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

        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(404, 'File not found');
        }

        $filePath = Storage::disk('public')->path($attachment->file_path);

        return response()->download($filePath, $attachment->original_name);
    }

    /**
     * Generate thumbnail for image files.
     */
    private function generateThumbnail(string $filePath, int $todoId): ?string
    {
        try {
            $fullPath = Storage::disk('public')->path($filePath);
            $thumbnailFileName = 'thumb_'.basename($filePath);
            $thumbnailPath = "todos/{$todoId}/thumbnails/{$thumbnailFileName}";
            $thumbnailFullPath = Storage::disk('public')->path($thumbnailPath);

            // Create thumbnails directory if it doesn't exist
            $thumbnailDir = dirname($thumbnailFullPath);
            if (! is_dir($thumbnailDir)) {
                mkdir($thumbnailDir, 0755, true);
            }

            // Create thumbnail using intervention/image if available, otherwise use basic PHP
            $imageClass = 'Intervention\\Image\\ImageManagerStatic';
            if (class_exists($imageClass)) {
                $image = $imageClass::make($fullPath);
                $image->fit(200, 200, function ($constraint) {
                    $constraint->upsize();
                });
                $image->save($thumbnailFullPath);
            } else {
                // Fallback to basic thumbnail generation
                $this->createBasicThumbnail($fullPath, $thumbnailFullPath);
            }

            return $thumbnailPath;
        } catch (\Exception $e) {
            // If thumbnail generation fails, return null
            return null;
        }
    }

    /**
     * Basic thumbnail generation without intervention/image.
     */
    private function createBasicThumbnail(string $source, string $destination): void
    {
        $imageInfo = getimagesize($source);
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
            $newHeight = ($height / $width) * $newWidth;
        } else {
            $newWidth = ($width / $height) * $newHeight;
        }

        // Create image resource based on type
        switch ($type) {
            case IMAGETYPE_JPEG:
                $sourceImage = imagecreatefromjpeg($source);
                break;
            case IMAGETYPE_PNG:
                $sourceImage = imagecreatefrompng($source);
                break;
            case IMAGETYPE_GIF:
                $sourceImage = imagecreatefromgif($source);
                break;
            default:
                return;
        }

        // Create thumbnail
        $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Save thumbnail
        switch ($type) {
            case IMAGETYPE_JPEG:
                imagejpeg($thumbnail, $destination, 85);
                break;
            case IMAGETYPE_PNG:
                imagepng($thumbnail, $destination);
                break;
            case IMAGETYPE_GIF:
                imagegif($thumbnail, $destination);
                break;
        }

        // Clean up
        imagedestroy($sourceImage);
        imagedestroy($thumbnail);
    }
}
