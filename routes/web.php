<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TodoController;
use Illuminate\Foundation\Application;
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
    $todos = auth()->user()->todos()->with('tags')->latest()->take(5)->get();
    return Inertia::render('Dashboard', [
        'todos' => $todos,
        'stats' => [
            'total' => auth()->user()->todos()->count(),
            'completed' => auth()->user()->todos()->where('is_completed', true)->count(),
            'pending' => auth()->user()->todos()->where('is_completed', false)->count(),
        ]
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::resource('todos', TodoController::class);
    Route::post('todos/{todo}/toggle', [TodoController::class, 'toggle'])->name('todos.toggle');
    Route::post('todos/{todo}/link', [TodoController::class, 'link'])->name('todos.link');
    Route::post('todos/{todo}/unlink', [TodoController::class, 'unlink'])->name('todos.unlink');

    // Tag management routes
    Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
    Route::put('/tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('/tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
    Route::get('/tags/search', [TagController::class, 'search'])->name('tags.search');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // API Token Management
    Route::post('/tokens', [ProfileController::class, 'createToken'])->name('tokens.create');
    Route::delete('/tokens/{token}', [ProfileController::class, 'deleteToken'])->name('tokens.delete');
});

require __DIR__.'/auth.php';
