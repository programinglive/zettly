<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drawing;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemMonitorController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $perPage = (int) $request->query('per_page', 10);
        $perPage = min(50, max(5, $perPage));

        $todosSearch = trim((string) $request->query('todos_search', ''));
        $notesSearch = trim((string) $request->query('notes_search', ''));
        $drawingsSearch = trim((string) $request->query('drawings_search', ''));

        $users = User::latest()
            ->limit(10)
            ->get(['id', 'name', 'email', 'role', 'created_at']);

        $todos = Todo::tasks()
            ->with('user:id,name')
            ->when($todosSearch !== '', function ($query) use ($todosSearch) {
                $query->where(function ($inner) use ($todosSearch) {
                    $inner->where('title', 'like', "%{$todosSearch}%")
                        ->orWhere('description', 'like', "%{$todosSearch}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(
                $perPage,
                ['id', 'user_id', 'title', 'description', 'priority', 'created_at'],
                'todos_page'
            )
            ->withQueryString();

        $notes = Todo::notes()
            ->with('user:id,name')
            ->when($notesSearch !== '', function ($query) use ($notesSearch) {
                $query->where(function ($inner) use ($notesSearch) {
                    $inner->where('title', 'like', "%{$notesSearch}%")
                        ->orWhere('description', 'like', "%{$notesSearch}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(
                $perPage,
                ['id', 'user_id', 'title', 'description', 'created_at'],
                'notes_page'
            )
            ->withQueryString();

        $drawings = Drawing::with('user:id,name')
            ->when($drawingsSearch !== '', function ($query) use ($drawingsSearch) {
                $query->where('title', 'like', "%{$drawingsSearch}%");
            })
            ->orderByDesc('created_at')
            ->paginate(
                $perPage,
                ['id', 'user_id', 'title', 'created_at'],
                'drawings_page'
            )
            ->withQueryString();

        return Inertia::render('Admin/SystemMonitor', [
            'appVersion' => config('app.version', 'unknown'),
            'environment' => config('app.env', 'unknown'),
            'debug' => config('app.debug', false),
            'metrics' => [
                'users' => User::count(),
                'todos' => Todo::tasks()->count(),
                'notes' => Todo::notes()->count(),
                'drawings' => Drawing::count(),
            ],
            'records' => [
                'users' => $users,
                'todos' => $todos,
                'notes' => $notes,
                'drawings' => $drawings,
            ],
            'filters' => [
                'todos_search' => $todosSearch,
                'notes_search' => $notesSearch,
                'drawings_search' => $drawingsSearch,
                'per_page' => $perPage,
            ],
        ]);
    }
}
