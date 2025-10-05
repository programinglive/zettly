<?php

use App\Http\Controllers\Api\TodoController;
use App\Http\Middleware\Cors;
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

// Todo API Routes (Protected by Sanctum and CORS)
Route::middleware(['auth:sanctum', Cors::class])->group(function () {
    Route::apiResource('todos', TodoController::class);
    Route::patch('todos/{todo}/toggle', [TodoController::class, 'toggle']);
});

// Handle preflight OPTIONS requests for CORS
Route::options('/todos', function () {
    return response()->json([], 200);
})->middleware([Cors::class]);

Route::options('/todos/{todo}', function () {
    return response()->json([], 200);
})->middleware([Cors::class])->where('todo', '[0-9]+');

Route::options('/todos/{todo}/toggle', function () {
    return response()->json([], 200);
})->middleware([Cors::class])->where('todo', '[0-9]+');
