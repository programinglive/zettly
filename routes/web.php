<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TodoController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/dashboard', function () {
    $todos = auth()->user()->todos()->latest()->take(5)->get();
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

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // API Token Management
    Route::post('/tokens', [ProfileController::class, 'createToken'])->name('tokens.create');
    Route::delete('/tokens/{token}', [ProfileController::class, 'deleteToken'])->name('tokens.delete');
});

require __DIR__.'/auth.php';
