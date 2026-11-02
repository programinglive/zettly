<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        $selectedTagIds = collect($request->input('tags', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        // The page component destructures `todos` and never reads it: the todo list
        // lives on /todos and /todos/board. Sending it meant loading every
        // non-archived task with tags, both link directions and attachments, then
        // serializing all of it - about 570 bytes per todo that no screen rendered.
        // Keep the counts, which are what a dashboard actually needs.
        $tasksQuery = $user->todos()->notArchived()->tasks();

        if (! empty($selectedTagIds)) {
            $tasksQuery->whereHas('tags', function ($query) use ($selectedTagIds) {
                $query->whereIn('tags.id', $selectedTagIds);
            });
        }

        $availableTags = $user->tags()
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        $notes = $user->todos()
            ->notArchived()
            ->notes()
            ->with('tags')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return Inertia::render('Dashboard', [
            'tasks' => [
                'open' => (clone $tasksQuery)->where('is_completed', false)->count(),
                'completed' => (clone $tasksQuery)->where('is_completed', true)->count(),
            ],
            'filters' => [
                'tags' => $selectedTagIds,
            ],
            'availableTags' => $availableTags,
            'notes' => $notes,
            'preferences' => [
                'workspace_view' => $user->workspace_view ?? null,
            ],
        ]);
    }
}
