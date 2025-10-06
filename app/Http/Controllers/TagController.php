<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TagController extends Controller
{
    /**
     * Display a listing of the user's tags.
     */
    public function index(Request $request)
    {
        $tags = Tag::forUser(auth()->id())
            ->withCount('todos')
            ->latest()
            ->get();

        $deletedTags = Tag::forUser(auth()->id())
            ->onlyTrashed()
            ->withCount('todos')
            ->latest('deleted_at')
            ->get();

        // Return JSON for API requests
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'tags' => $tags,
                'deletedTags' => $deletedTags,
            ]);
        }

        // Return Inertia view for web requests
        return Inertia::render('Tags/Index', [
            'tags' => $tags,
            'deletedTags' => $deletedTags,
        ]);
    }

    /**
     * Store a newly created tag.
     */
    public function store(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'nullable|string',
        ]);

        // Generate a random color if none provided
        if (empty($validated['color'])) {
            $colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
            $validated['color'] = $colors[array_rand($colors)];
        }

        // Ensure color has # prefix and is valid hex
        if (! str_starts_with($validated['color'], '#')) {
            $validated['color'] = '#'.$validated['color'];
        }

        // Simple validation - just check if it looks like a hex color
        if (! preg_match('/^#[0-9A-Fa-f]{3,6}$/', $validated['color'])) {
            $validated['color'] = '#3B82F6'; // Default blue
        }

        // Check if tag already exists for this user
        $existingTag = Tag::where('user_id', auth()->id())
            ->where('name', trim($validated['name']))
            ->first();

        if ($existingTag) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'A tag with this name already exists',
                    'tag' => $existingTag,
                ], 409); // Conflict status code
            }

            return redirect()->route('tags.index')
                ->with('error', 'A tag with this name already exists!');
        }

        // Create new tag
        try {
            $tag = Tag::create([
                'user_id' => auth()->id(),
                'name' => trim($validated['name']),
                'color' => $validated['color'],
            ]);

            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json($tag, 201);
            }

            return redirect()->route('tags.index')
                ->with('success', 'Tag created successfully!');
        } catch (\Exception $e) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Failed to create tag'], 500);
            }

            return redirect()->route('tags.index')
                ->with('error', 'Failed to create tag. Please try again.');
        }
    }

    /**
     * Update the specified tag.
     */
    public function update(Request $request, Tag $tag): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        // Ensure user owns the tag
        if ($tag->user_id !== auth()->id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'nullable|string',
        ]);

        // Check if another tag with the same name exists (excluding current tag)
        $existingTag = Tag::where('user_id', auth()->id())
            ->where('name', trim($validated['name']))
            ->where('id', '!=', $tag->id)
            ->first();

        if ($existingTag) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'A tag with this name already exists',
                ], 409);
            }

            return redirect()->route('tags.index')
                ->with('error', 'A tag with this name already exists!');
        }

        // Keep existing color if none provided (for updates)
        if (empty($validated['color'])) {
            $validated['color'] = $tag->color; // Keep existing color
        }

        // Ensure color has # prefix and is valid hex
        if (! str_starts_with($validated['color'], '#')) {
            $validated['color'] = '#'.$validated['color'];
        }

        // Simple validation - just check if it looks like a hex color
        if (! preg_match('/^#[0-9A-Fa-f]{3,6}$/', $validated['color'])) {
            $validated['color'] = '#3B82F6'; // Default blue
        }

        $validated['name'] = trim($validated['name']);
        $tag->update($validated);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($tag);
        }

        return redirect()->route('tags.index')
            ->with('success', 'Tag updated successfully!');
    }

    /**
     * Remove the specified tag.
     */
    public function destroy(Request $request, Tag $tag): \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
    {
        // Ensure user owns the tag
        if ($tag->user_id !== auth()->id()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            abort(403);
        }

        $tag->delete();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Tag deleted successfully']);
        }

        return redirect()->route('tags.index')
            ->with('success', 'Tag deleted successfully!');
    }

    /**
     * Search tags by name.
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->get('q', '');

        $tags = Tag::forUser(auth()->id())
            ->where('name', 'like', "%{$query}%")
            ->latest()
            ->limit(10)
            ->get();

        return response()->json($tags);
    }

    /**
     * Restore a soft-deleted tag.
     */
    public function restore(Request $request, $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $tag = Tag::forUser(auth()->id())->onlyTrashed()->findOrFail($id);

        $tag->restore();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Tag restored successfully', 'tag' => $tag]);
        }

        return redirect()->route('tags.index')
            ->with('success', 'Tag restored successfully!');
    }
}
