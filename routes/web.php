<?php

use App\Http\Controllers\Admin\SystemMonitorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DrawingController;
use App\Http\Controllers\EmailTestController;
use App\Http\Controllers\FocusController;
use App\Http\Controllers\GeminiTestController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PusherTestController;
use App\Http\Controllers\SystemStatusController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TodoController;
use App\Http\Controllers\UploadTestController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/developer', function () {
    return Inertia::render('Developer');
})->name('developer');

Route::get('/test/pusher-ui', function () {
    return Inertia::render('Test/PusherTest');
})->name('test.pusher.ui');

Route::get('/debug/broadcast', [App\Http\Controllers\BroadcastDebugController::class, 'debug'])
    ->middleware(['web'])
    ->name('debug.broadcast');

Route::get('/legal/terms', function () {
    return Inertia::render('Legal/Terms');
})->name('legal.terms');

Route::get('/legal/privacy', function () {
    return Inertia::render('Legal/Privacy');
})->name('legal.privacy');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    // Special routes that need to come before resource routes
    Route::get('todos/archived', [TodoController::class, 'archived'])->name('todos.archived');
    Route::get('todos/completed', [TodoController::class, 'completed'])->name('todos.completed');
    Route::get('todos/deleted', [TodoController::class, 'deleted'])->name('todos.deleted');
    Route::post('todos/archive-completed', [TodoController::class, 'archiveCompleted'])->name('todos.archive-completed');
    Route::post('todos/{todo}/restore', [TodoController::class, 'restore'])->name('todos.restore');
    Route::post('todos/{todo}/restore-deleted', [TodoController::class, 'restoreDeleted'])->name('todos.restore-deleted');

    Route::get('/system-status', SystemStatusController::class)->name('system.status');

    Route::get('notes', [TodoController::class, 'notes'])->name('notes.index');
    Route::resource('todos', TodoController::class);
    Route::post('todos/{todo}/toggle', [TodoController::class, 'toggle'])->name('todos.toggle');
    Route::post('todos/{todo}/update-priority', [TodoController::class, 'updatePriority'])->name('todos.update-priority');
    Route::post('todos/{todo}/update-eisenhower', [TodoController::class, 'updateEisenhower'])->name('todos.update-eisenhower');
    Route::post('todos/reorder', [TodoController::class, 'reorder'])->name('todos.reorder');
    Route::post('todos/{todo}/link', [TodoController::class, 'link'])->name('todos.link');
    Route::post('todos/{todo}/unlink', [TodoController::class, 'unlink'])->name('todos.unlink');
    Route::post('todos/{todo}/archive', [TodoController::class, 'archive'])->name('todos.archive');
    Route::patch('todos/{todo}/checklist/{checklistItem}/toggle', [TodoController::class, 'toggleChecklistItem'])->name('todos.checklist.toggle');

    Route::get('draw', [DrawingController::class, 'index'])->name('draw.index');
    Route::get('draw/create', [DrawingController::class, 'create'])->name('draw.create');
    Route::post('draw', [DrawingController::class, 'store'])->name('draw.store');
    Route::get('draw/{drawing}', [DrawingController::class, 'show'])->where('drawing', '\d+')->name('draw.show');
    Route::patch('draw/{drawing}', [DrawingController::class, 'update'])->where('drawing', '\d+')->name('draw.update');
    Route::delete('draw/{drawing}', [DrawingController::class, 'destroy'])->where('drawing', '\d+')->name('draw.destroy');

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
    Route::post('/profile/workspace-preference', [ProfileController::class, 'updateWorkspacePreference'])->name('profile.workspace-preference');

    Route::middleware('super-admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('system-monitor', SystemMonitorController::class)->name('system-monitor');
    });

    Route::middleware('super-admin')->group(function () {
        Route::get('/test/email', [EmailTestController::class, 'index'])->name('test.email');
        Route::post('/test/email', [EmailTestController::class, 'send'])->name('test.email.send');
    });

    // API Token Management
    Route::post('/tokens', [ProfileController::class, 'createToken'])->name('tokens.create');
    Route::delete('/tokens/{token}', [ProfileController::class, 'deleteToken'])->name('tokens.delete');

    Route::get('/upload', [UploadTestController::class, 'show'])->name('upload.show');
    Route::post('/upload', [UploadTestController::class, 'store'])->name('upload.store');

    // Gemini demo routes
    Route::get('/gemini-test', [GeminiTestController::class, 'test'])->name('gemini.test');
    Route::get('/gemini/chat', fn () => Inertia::render('Gemini/Chat'))->name('gemini.chat.page');
    Route::post('/gemini/chat', [GeminiTestController::class, 'chat'])->name('gemini.chat');

    // Push notification routes
    Route::post('/push-subscriptions', [\App\Http\Controllers\PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('/push-subscriptions', [\App\Http\Controllers\PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
    Route::post('/push/test', [\App\Http\Controllers\PushSubscriptionController::class, 'test'])->name('push.test');

    // Pusher test routes (for development/testing)
    Route::get('/test/pusher', [PusherTestController::class, 'test'])->name('test.pusher');
    Route::post('/test/pusher/broadcast', [PusherTestController::class, 'testBroadcast'])->name('test.pusher.broadcast');

    // Focus management routes
    Route::get('/focus/current', [FocusController::class, 'current'])->name('focus.current');
    Route::get('/focus', [FocusController::class, 'index'])->name('focus.index');
    Route::post('/focus', [FocusController::class, 'store'])->name('focus.store');
    Route::post('/focus/{focus}/complete', [FocusController::class, 'complete'])->name('focus.complete');
    Route::delete('/focus/{focus}', [FocusController::class, 'destroy'])->name('focus.destroy');

    // Organization management routes
    Route::resource('organizations', OrganizationController::class);
    Route::get('organizations/{organization}/settings', [OrganizationController::class, 'settings'])->name('organizations.settings');
    Route::post('organizations/{organization}/invite', [OrganizationController::class, 'invite'])->name('organizations.invite');
    Route::delete('organizations/{organization}/members/{member}', [OrganizationController::class, 'removeMember'])->name('organizations.remove-member');
    Route::patch('organizations/{organization}/members/{member}/role', [OrganizationController::class, 'updateMemberRole'])->name('organizations.update-member-role');
    Route::post('organizations/{organization}/leave', [OrganizationController::class, 'leave'])->name('organizations.leave');
});

require __DIR__.'/auth.php';
