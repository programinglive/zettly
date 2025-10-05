<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    /**
     * Display a listing of the user's tags.
     */
    public function index(): JsonResponse
    {
        $tags = Tag::forUser(auth()->id())
            ->withCount('todos')
            ->latest()
            ->get();

        return response()->json($tags);
    }

    /**
     * Store a newly created tag.
     */
    public function store(Request $request): JsonResponse
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

        return response()->json($tag, $tag->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Update the specified tag.
     */
    public function update(Request $request, Tag $tag): JsonResponse
    {
        // Ensure user owns the tag
        if ($tag->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
        ]);

        $tag->update($validated);

        return response()->json($tag);
    }

    /**
     * Remove the specified tag.
     */
    public function destroy(Tag $tag): JsonResponse
    {
        // Ensure user owns the tag
        if ($tag->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $tag->delete();

        return response()->json(['message' => 'Tag deleted successfully']);
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
