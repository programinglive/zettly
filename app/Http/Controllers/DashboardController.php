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

        $todosQuery = $user->todos()
            ->notArchived()
            ->tasks()
            ->with(['tags', 'relatedTodos', 'linkedByTodos'])
            ->orderBy('is_completed', 'asc')
            ->orderByRaw("CASE 
            WHEN priority = 'urgent' THEN 1 
            WHEN priority = 'not_urgent' THEN 2 
            ELSE 3 END")
            ->orderByRaw("CASE 
            WHEN importance = 'important' THEN 1 
            WHEN importance = 'not_important' THEN 2 
            ELSE 3 END")
            ->orderBy('created_at', 'desc');

        if (! empty($selectedTagIds)) {
            $todosQuery->whereHas('tags', function ($query) use ($selectedTagIds) {
                $query->whereIn('tags.id', $selectedTagIds);
            });
        }

        $todos = $todosQuery->get();

        $notArchivedTodos = $user->todos()->notArchived()->tasks();

        $stats = [
            'important_urgent' => (clone $notArchivedTodos)
                ->where('is_completed', false)
                ->where('importance', Todo::IMPORTANCE_IMPORTANT)
                ->where('priority', Todo::PRIORITY_URGENT)
                ->count(),
            'important_not_urgent' => (clone $notArchivedTodos)
                ->where('is_completed', false)
                ->where('importance', Todo::IMPORTANCE_IMPORTANT)
                ->where('priority', Todo::PRIORITY_NOT_URGENT)
                ->count(),
            'not_important_urgent' => (clone $notArchivedTodos)
                ->where('is_completed', false)
                ->where('importance', Todo::IMPORTANCE_NOT_IMPORTANT)
                ->where('priority', Todo::PRIORITY_URGENT)
                ->count(),
            'not_important_not_urgent' => (clone $notArchivedTodos)
                ->where('is_completed', false)
                ->where('importance', Todo::IMPORTANCE_NOT_IMPORTANT)
                ->where('priority', Todo::PRIORITY_NOT_URGENT)
                ->count(),
            'completed' => (clone $notArchivedTodos)->where('is_completed', true)->count(),
            'archived' => $user->todos()->archived()->count(),
        ];

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
            'todos' => $todos,
            'stats' => $stats,
            'filters' => [
                'tags' => $selectedTagIds,
            ],
            'availableTags' => $availableTags,
            'notes' => $notes,
        ]);
    }
}
