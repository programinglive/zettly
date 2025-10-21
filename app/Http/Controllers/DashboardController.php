<?php

namespace App\Http\Controllers;

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

        $todosQuery = $user->todos()
            ->notArchived()
            ->tasks()
            ->with('tags')
            ->orderBy('is_completed', 'asc')
            ->orderByRaw("CASE 
            WHEN priority = 'urgent' THEN 1 
            WHEN priority = 'high' THEN 2 
            WHEN priority = 'medium' THEN 3 
            WHEN priority = 'low' THEN 4 
            ELSE 5 END")
            ->orderBy('created_at', 'desc');

        if (! empty($selectedTagIds)) {
            $todosQuery->whereHas('tags', function ($query) use ($selectedTagIds) {
                $query->whereIn('tags.id', $selectedTagIds);
            });
        }

        $todos = $todosQuery->get();

        $notArchivedTodos = $user->todos()->notArchived()->tasks();

        $stats = [
            'total' => (clone $notArchivedTodos)->count(),
            'completed' => (clone $notArchivedTodos)->where('is_completed', true)->count(),
            'pending' => (clone $notArchivedTodos)->where('is_completed', false)->count(),
            'urgent' => (clone $notArchivedTodos)->where('is_completed', false)->where('priority', 'urgent')->count(),
            'high' => (clone $notArchivedTodos)->where('is_completed', false)->where('priority', 'high')->count(),
            'archived' => $user->todos()->archived()->count(),
        ];

        $availableTags = $user->tags()
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        return Inertia::render('Dashboard', [
            'todos' => $todos,
            'stats' => $stats,
            'filters' => [
                'tags' => $selectedTagIds,
            ],
            'availableTags' => $availableTags,
        ]);
    }
}
