<?php

use App\Http\Controllers\Api\TodoController;
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
    Route::apiResource('todos', TodoController::class);
    Route::patch('todos/{todo}/toggle', [TodoController::class, 'toggle']);
    
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
});
