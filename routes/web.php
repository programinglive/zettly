<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TodoController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/developer', function () {
    return Inertia::render('Developer');
})->name('developer');

Route::get('/legal/terms', function () {
    return Inertia::render('Legal/Terms');
})->name('legal.terms');

Route::get('/legal/privacy', function () {
    return Inertia::render('Legal/Privacy');
})->name('legal.privacy');

Route::get('/dashboard', function () {
    $user = auth()->user();

    $selectedTagIds = collect(request()->input('tags', []))
        ->filter()
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values()
        ->all();

    $todosQuery = $user->todos()
        ->notArchived()
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

    $todos = $todosQuery
        ->take(10)
        ->get();

    return Inertia::render('Dashboard', [
        'todos' => $todos,
        'stats' => [
            'total' => $user->todos()->count(),
            'completed' => $user->todos()->where('is_completed', true)->count(),
            'pending' => $user->todos()->where('is_completed', false)->count(),
            'urgent' => $user->todos()->where('priority', 'urgent')->count(),
            'high' => $user->todos()->where('priority', 'high')->count(),
        ],
        'filters' => [
            'tags' => $selectedTagIds,
        ],
        'availableTags' => $user->tags()
            ->orderBy('name')
            ->get(['id', 'name', 'color']),
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    // Special routes that need to come before resource routes
    Route::get('todos/archived', [TodoController::class, 'archived'])->name('todos.archived');
    Route::post('todos/archive-completed', [TodoController::class, 'archiveCompleted'])->name('todos.archive-completed');

    Route::resource('todos', TodoController::class);
    Route::post('todos/{todo}/toggle', [TodoController::class, 'toggle'])->name('todos.toggle');
    Route::post('todos/{todo}/update-priority', [TodoController::class, 'updatePriority'])->name('todos.update-priority');
    Route::post('todos/{todo}/link', [TodoController::class, 'link'])->name('todos.link');
    Route::post('todos/{todo}/unlink', [TodoController::class, 'unlink'])->name('todos.unlink');
    Route::patch('todos/{todo}/checklist/{checklistItem}/toggle', [TodoController::class, 'toggleChecklistItem'])->name('todos.checklist.toggle');

    // File attachment routes
    Route::post('todos/{todo}/attachments', [TodoController::class, 'uploadAttachment'])->name('todos.attachments.upload');
    Route::delete('attachments/{attachment}', [TodoController::class, 'deleteAttachment'])->name('attachments.delete');
    Route::get('attachments/{attachment}/download', [TodoController::class, 'downloadAttachment'])->name('attachments.download');

    // Tag management routes (web interface)
    Route::get('/manage/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('/manage/tags', [TagController::class, 'store'])->name('tags.store');
    Route::put('/manage/tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('/manage/tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
    Route::post('/manage/tags/{id}/restore', [TagController::class, 'restore'])->name('tags.restore');
    Route::get('/manage/tags/search', [TagController::class, 'search'])->name('tags.search');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // API Token Management
    Route::post('/tokens', [ProfileController::class, 'createToken'])->name('tokens.create');
    Route::delete('/tokens/{token}', [ProfileController::class, 'deleteToken'])->name('tokens.delete');
});

require __DIR__.'/auth.php';
