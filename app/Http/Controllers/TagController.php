<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

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

        // Return JSON for API requests
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($tags);
        }

        // Return Inertia view for web requests
        return Inertia::render('Tags/Index', [
            'tags' => $tags
        ]);
    }

    /**
     * Store a newly created tag.
     */
    public function store(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
        ]);

        $tag = Tag::firstOrCreate(
            [
                'user_id' => auth()->id(),
                'name' => $validated['name']
            ],
            [
                'color' => $validated['color']
            ]
        );

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($tag, $tag->wasRecentlyCreated ? 201 : 200);
        }

        return redirect()->route('tags.index')
            ->with('success', 'Tag created successfully!');
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
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
        ]);

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
}
