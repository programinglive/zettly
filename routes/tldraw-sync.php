<?php

use App\Http\Controllers\TLDrawSyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TLDraw Sync Routes
|--------------------------------------------------------------------------
|
| These routes handle TLDraw real-time synchronization
|
*/

Route::middleware(['auth', 'web'])->group(function () {
    // Authentication for WebSocket connections
    Route::post('/tldraw/sync/auth', [TLDrawSyncController::class, 'authenticate'])
        ->name('tldraw.sync.auth');

    // Document operations
    Route::get('/tldraw/sync/document/{drawingId}', [TLDrawSyncController::class, 'loadDocument'])
        ->name('tldraw.sync.load');

    Route::post('/tldraw/sync/document/{drawingId}', [TLDrawSyncController::class, 'saveDocument'])
        ->name('tldraw.sync.save');

    // Real-time updates
    Route::post('/tldraw/sync/update/{drawingId}', [TLDrawSyncController::class, 'updateDocument'])
        ->name('tldraw.sync.update');

    // Asset handling
    Route::post('/tldraw/sync/upload', [TLDrawSyncController::class, 'uploadAsset'])
        ->name('tldraw.sync.upload');

    // Presence
    Route::get('/tldraw/sync/presence/{drawingId}', [TLDrawSyncController::class, 'getPresence'])
        ->name('tldraw.sync.presence');

    Route::post('/tldraw/sync/presence/{drawingId}', [TLDrawSyncController::class, 'updatePresence'])
        ->name('tldraw.sync.presence.update');

    // Join/Leave for presence tracking
    Route::post('/tldraw/sync/join/{drawingId}', [TLDrawSyncController::class, 'joinDrawing'])
        ->name('tldraw.sync.join');

    Route::post('/tldraw/sync/leave/{drawingId}', [TLDrawSyncController::class, 'leaveDrawing'])
        ->name('tldraw.sync.leave');
});
