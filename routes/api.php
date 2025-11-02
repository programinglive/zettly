<?php

use App\Http\Controllers\Api\TodoController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\TagController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// API Routes (Protected by Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Todo API Routes
    Route::apiResource('todos', TodoController::class)->names([
        'index' => 'api.todos.index',
        'store' => 'api.todos.store',
        'show' => 'api.todos.show',
        'update' => 'api.todos.update',
        'destroy' => 'api.todos.destroy',
    ]);
    Route::patch('todos/{todo}/toggle', [TodoController::class, 'toggle'])->name('api.todos.toggle');
    Route::get('todos/priorities', [TodoController::class, 'priorities'])->name('api.todos.priorities');

    // Tag API Routes
    Route::apiResource('tags', TagController::class)->except(['create', 'edit'])->names([
        'index' => 'api.tags.index',
        'store' => 'api.tags.store',
        'show' => 'api.tags.show',
        'update' => 'api.tags.update',
        'destroy' => 'api.tags.destroy',
    ]);
    Route::post('tags/{id}/restore', [TagController::class, 'restore'])->name('api.tags.restore');
    Route::get('tags/search', [TagController::class, 'search'])->name('api.tags.search');

    // Push Subscription Routes
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('api.push-subscriptions.store');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('api.push-subscriptions.destroy');
    Route::post('push/test', [PushSubscriptionController::class, 'test'])->name('api.push-subscriptions.test');
});

// Push routes with session auth (for web clients)
Route::middleware('auth')->group(function () {
    Route::post('push/test', [PushSubscriptionController::class, 'test'])->name('api.push-subscriptions.test-web');
});
