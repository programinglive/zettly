<?php

use App\Http\Controllers\Api\TodoController;
use App\Http\Controllers\Api\CliAuthController;
use App\Http\Controllers\Api\CliApiController;
use App\Http\Controllers\DrawingController;
use App\Http\Controllers\FocusController;
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

    // Focus API Routes
    Route::get('/focus/current', [FocusController::class, 'current'])->name('api.focus.current');
    Route::get('/focus', [FocusController::class, 'index'])->name('api.focus.index');
    Route::post('/focus', [FocusController::class, 'store'])->name('api.focus.store');
    Route::put('/focus/{focus}', [FocusController::class, 'update'])->name('api.focus.update');
    Route::post('/focus/{focus}/complete', [FocusController::class, 'complete'])->name('api.focus.complete');
    Route::delete('/focus/{focus}', [FocusController::class, 'destroy'])->name('api.focus.destroy');
});

// Stable API surface used by the standalone CLI. Keep /api endpoints backwards compatible.
// Public auth endpoints are throttled; user-specific CLI routes require a scoped token.
Route::prefix('v1')->middleware('throttle:6,1')->group(function () {
    Route::post('auth/login', [CliAuthController::class, 'login'])->name('api.v1.auth.login');
    Route::post('auth/register', [CliAuthController::class, 'register'])->name('api.v1.auth.register');
    Route::post('auth/forgot-password', [CliAuthController::class, 'sendPasswordResetLink'])->name('api.v1.auth.forgot-password');
    Route::post('auth/reset-password', [CliAuthController::class, 'resetPassword'])->name('api.v1.auth.reset-password');
});

Route::prefix('v1')->middleware(['auth:sanctum', 'abilities:zettly:cli'])->group(function () {
    Route::get('user', fn (Request $request) => $request->user()->only(['id', 'name', 'email', 'workspace_view']))->name('api.v1.user');
    Route::get('profile', [CliApiController::class, 'profile'])->name('api.v1.profile.show');
    Route::patch('profile', [CliApiController::class, 'updateProfile'])->name('api.v1.profile.update');
    Route::put('profile/password', [CliApiController::class, 'changePassword'])->name('api.v1.profile.password');
    Route::post('auth/verification-notification', [CliApiController::class, 'resendVerification'])->middleware('throttle:6,1')->name('api.v1.auth.verification-notification');
    Route::delete('profile', [CliApiController::class, 'deleteProfile'])->name('api.v1.profile.destroy');
    Route::post('auth/token', [CliApiController::class, 'issueCliToken'])->name('api.v1.auth.token');
    Route::delete('profile/tokens/{token}', [CliApiController::class, 'deleteToken'])->name('api.v1.profile.tokens.destroy');
    Route::apiResource('todos', TodoController::class)->names([
        'index' => 'api.v1.todos.index', 'store' => 'api.v1.todos.store', 'show' => 'api.v1.todos.show',
        'update' => 'api.v1.todos.update', 'destroy' => 'api.v1.todos.destroy',
    ]);
    Route::patch('todos/{todo}/toggle', [App\Http\Controllers\TodoController::class, 'toggle'])->name('api.v1.todos.toggle');
    Route::post('todos/{todo}/archive', [App\Http\Controllers\TodoController::class, 'archive'])->name('api.v1.todos.archive');
    Route::post('todos/{todo}/restore', [App\Http\Controllers\TodoController::class, 'restore'])->name('api.v1.todos.restore');
    Route::post('todos/{todo}/restore-deleted', [App\Http\Controllers\TodoController::class, 'restoreDeleted'])->name('api.v1.todos.restore-deleted');
    Route::post('todos/archive-completed', [App\Http\Controllers\TodoController::class, 'archiveCompleted'])->name('api.v1.todos.archive-completed');
    Route::post('todos/{todo}/update-priority', [App\Http\Controllers\TodoController::class, 'updatePriority'])->name('api.v1.todos.update-priority');
    Route::post('todos/{todo}/update-eisenhower', [App\Http\Controllers\TodoController::class, 'updateEisenhower'])->name('api.v1.todos.update-eisenhower');
    Route::post('todos/{todo}/link', [App\Http\Controllers\TodoController::class, 'link'])->name('api.v1.todos.link');
    Route::post('todos/{todo}/unlink', [App\Http\Controllers\TodoController::class, 'unlink'])->name('api.v1.todos.unlink');
    Route::post('todos/reorder', [App\Http\Controllers\TodoController::class, 'reorder'])->name('api.v1.todos.reorder');
    Route::patch('todos/{todo}/checklist/{checklistItem}/toggle', [App\Http\Controllers\TodoController::class, 'toggleChecklistItem'])->name('api.v1.todos.checklist.toggle');
    Route::get('tags/search', [TagController::class, 'search'])->name('api.v1.tags.search');
    Route::apiResource('tags', TagController::class)->except(['create', 'edit'])->names([
        'index' => 'api.v1.tags.index', 'store' => 'api.v1.tags.store', 'show' => 'api.v1.tags.show',
        'update' => 'api.v1.tags.update', 'destroy' => 'api.v1.tags.destroy',
    ]);
    Route::post('tags/{id}/restore', [TagController::class, 'restore'])->name('api.v1.tags.restore');
    Route::get('focus/current', [FocusController::class, 'current'])->name('api.v1.focus.current');
    Route::get('focus/{focus}', [CliApiController::class, 'showFocus'])->name('api.v1.focus.show');
    Route::get('focus', [FocusController::class, 'index'])->name('api.v1.focus.index');
    Route::post('focus', [FocusController::class, 'store'])->name('api.v1.focus.store');
    Route::match(['put', 'patch'], 'focus/{focus}', [FocusController::class, 'update'])->name('api.v1.focus.update');
    Route::delete('focus/{focus}', [FocusController::class, 'destroy'])->name('api.v1.focus.destroy');
    Route::post('focus/{focus}/complete', [FocusController::class, 'complete'])->name('api.v1.focus.complete');
    Route::get('habits', [CliApiController::class, 'habits'])->name('api.v1.habits.index');
    Route::get('habits/{habit}', [CliApiController::class, 'showHabit'])->name('api.v1.habits.show');
    Route::post('habits', [CliApiController::class, 'createHabit'])->name('api.v1.habits.store');
    Route::patch('habits/{habit}', [CliApiController::class, 'updateHabit'])->name('api.v1.habits.update');
    Route::delete('habits/{habit}', [CliApiController::class, 'deleteHabit'])->name('api.v1.habits.destroy');
    Route::post('habits/{habit}/toggle', [App\Http\Controllers\HabitController::class, 'toggle'])->name('api.v1.habits.toggle');
    Route::get('habits/{habit}/stats', [CliApiController::class, 'habitStats'])->name('api.v1.habits.stats');
    Route::get('drawings', [CliApiController::class, 'drawings'])->name('api.v1.drawings.index');
    Route::post('drawings', [DrawingController::class, 'store'])->name('api.v1.drawings.store');
    Route::get('drawings/{drawing}', [DrawingController::class, 'show'])->name('api.v1.drawings.show');
    Route::patch('drawings/{drawing}', [DrawingController::class, 'update'])->name('api.v1.drawings.update');
    Route::delete('drawings/{drawing}', [DrawingController::class, 'destroy'])->name('api.v1.drawings.destroy');
    Route::get('organizations', [CliApiController::class, 'organizations'])->name('api.v1.organizations.index');
    Route::post('organizations', [CliApiController::class, 'createOrganization'])->name('api.v1.organizations.store');
    Route::get('organizations/{organization}', [CliApiController::class, 'showOrganization'])->name('api.v1.organizations.show');
    Route::patch('organizations/{organization}', [CliApiController::class, 'updateOrganization'])->name('api.v1.organizations.update');
    Route::delete('organizations/{organization}', [CliApiController::class, 'deleteOrganization'])->name('api.v1.organizations.destroy');
    Route::post('organizations/{organization}/invite', [CliApiController::class, 'inviteOrganizationMember'])->name('api.v1.organizations.invite');
    Route::patch('organizations/{organization}/members/{member}/role', [CliApiController::class, 'updateMemberRole'])->name('api.v1.organizations.members.role');
    Route::delete('organizations/{organization}/members/{member}', [CliApiController::class, 'removeOrganizationMember'])->name('api.v1.organizations.members.destroy');
    Route::post('organizations/{organization}/leave', [CliApiController::class, 'leaveOrganization'])->name('api.v1.organizations.leave');
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('api.v1.push-subscriptions.store');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('api.v1.push-subscriptions.destroy');
    Route::post('push/test', [PushSubscriptionController::class, 'test'])->name('api.v1.push.test');
    Route::get('push-subscriptions', [CliApiController::class, 'pushStatus'])->name('api.v1.push-subscriptions.index');
    Route::post('todos/{todo}/attachments', [App\Http\Controllers\TodoController::class, 'uploadAttachment'])->name('api.v1.todos.attachments.upload');
    Route::get('attachments', [CliApiController::class, 'attachments'])->name('api.v1.attachments.index');
    Route::get('attachments/{attachment}', [CliApiController::class, 'showAttachment'])->name('api.v1.attachments.show');
    Route::delete('attachments/{attachment}', [App\Http\Controllers\TodoController::class, 'deleteAttachment'])->name('api.v1.attachments.destroy');
    Route::get('attachments/{attachment}/download', [App\Http\Controllers\TodoController::class, 'downloadAttachment'])->name('api.v1.attachments.download');
    Route::get('system/status', App\Http\Controllers\SystemStatusController::class)->name('api.v1.system.status');
    Route::get('graph/export', [App\Http\Controllers\Api\GraphApiController::class, 'export'])->name('api.v1.graph.export');
    Route::post('graph/rebuild', [App\Http\Controllers\Api\GraphApiController::class, 'rebuild'])->middleware('super-admin')->name('api.v1.graph.rebuild');
    Route::middleware('super-admin')->get('admin/system-monitor', App\Http\Controllers\Admin\SystemMonitorController::class)->name('api.v1.admin.system-monitor');
    Route::post('admin/email-test', [App\Http\Controllers\EmailTestController::class, 'send'])->middleware('super-admin')->name('api.v1.admin.email-test');
});

// Push routes with session auth (for web clients)
Route::middleware('auth')->group(function () {
    Route::post('push/test', [PushSubscriptionController::class, 'test'])->name('api.push-subscriptions.test-web');
});
