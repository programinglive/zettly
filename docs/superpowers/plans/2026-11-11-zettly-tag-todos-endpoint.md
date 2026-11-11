# Zettly Tag-Scoped Todo Listing Endpoint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/todos/by-tag/{tag}` so one tag's todos can be listed with pagination instead of fetching the whole todo collection.

**Architecture:** One new read-only action on the existing `Api\TodoController`, registered in the existing `v1` Sanctum + `zettly:cli` route group before the `todos` resource wildcard. It reuses the `Tag::todos()` belongsToMany relation and returns the same JSON envelope as the index endpoint plus pagination metadata.

**Tech Stack:** Laravel 12, PHP 8.3, PHPUnit 11, Sanctum, SQLite in-memory for tests.

**Spec:** `docs/superpowers/specs/2026-11-11-zettly-tag-todos-endpoint-design.md`

## Global Constraints

- Route must be declared before `Route::apiResource('todos', ...)` in the `v1` group.
- Auth: `auth:sanctum` + `abilities:zettly:cli` (already on the group).
- Ownership: `tag.user_id === auth()->id()`, else `403` with `{ success: false, message: 'Unauthorized' }`.
- `per_page` default 50, clamped to 1..100; `page` default 1, minimum 1.
- Response envelope: `{ success: true, data: [...], pagination: { total, per_page, current_page, last_page } }`.
- New identifiers, comments, test names and docs in English.

## Review Focus

- A tag id that belongs to another user must return 403, never that user's todos.
- A tag with zero todos must return an empty `data` array and `total: 0`, not a 404.
- `per_page` above 100 must be clamped, not honored, so the size limit cannot return.
- A non-numeric or missing tag id must 404 through route-model binding, not 500.
- The literal `todos/by-tag/...` path must not be captured by `todos/{todo}`.

---

### Task 1: Add the by-tag endpoint with a feature test

**Files:**
- Modify: `routes/api.php` (inside the `Route::prefix('v1')->middleware(['auth:sanctum', 'abilities:zettly:cli'])` group, before `Route::apiResource('todos', ...)`)
- Modify: `app/Http/Controllers/Api/TodoController.php` (add `byTag` after `index`)
- Test: `tests/Feature/Api/TodoByTagApiTest.php` (create)

**Interfaces:**
- Consumes: `App\Models\Tag::todos()` (belongsToMany to `Todo`), `App\Models\Todo` scopes, `Auth::id()`.
- Produces: route name `api.v1.todos.by-tag`; controller method `byTag(Request $request, Tag $tag): JsonResponse`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Api/TodoByTagApiTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TodoByTagApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_only_the_todos_of_the_requested_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'area:factory']);
        $otherTag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'area:other']);

        $tagged = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $tagged->tags()->attach($tag->id);
        $untagged = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $untagged->tags()->attach($otherTag->id);

        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/todos/by-tag/'.$tag->id);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $tagged->id);
        $this->assertNotContains($untagged->id, array_column($response->json('data'), 'id'));
    }

    public function test_it_paginates_and_caps_per_page(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);
        $todos = Todo::factory()->asTask()->count(3)->create(['user_id' => $user->id]);
        $tag->todos()->attach($todos->pluck('id'));

        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?per_page=2&page=2');

        $response->assertOk()
            ->assertJsonPath('pagination.per_page', 2)
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.total', 3)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonCount(1, 'data');

        $capped = $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?per_page=500');
        $capped->assertOk()->assertJsonPath('pagination.per_page', 100);
    }

    public function test_it_returns_an_empty_list_for_a_tag_without_todos(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertOk()
            ->assertJsonPath('pagination.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_it_rejects_a_tag_owned_by_another_user(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($intruder, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_it_404s_for_an_unknown_tag(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/999999')->assertNotFound();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Api/TodoByTagApiTest.php`
Expected: FAIL — 404 for every case because the route does not exist yet.

- [ ] **Step 3: Register the route**

In `routes/api.php`, inside the `v1` group, immediately before `Route::apiResource('todos', TodoController::class)`:

```php
Route::get('todos/by-tag/{tag}', [TodoController::class, 'byTag'])->name('api.v1.todos.by-tag');
```

- [ ] **Step 4: Implement `byTag` in `app/Http/Controllers/Api/TodoController.php`**

Add after `index()`:

```php
/**
 * List the todos linked to a single tag, paginated.
 */
public function byTag(Request $request, Tag $tag): JsonResponse
{
    if ($tag->user_id !== Auth::id()) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized',
        ], 403);
    }

    $perPage = min(max((int) $request->input('per_page', 50), 1), 100);
    $page = max((int) $request->input('page', 1), 1);

    $todos = $tag->todos()
        ->with(['tags', 'checklistItems'])
        ->latest()
        ->paginate($perPage, ['*'], 'page', $page);

    return response()->json([
        'success' => true,
        'data' => $todos->items(),
        'pagination' => [
            'total' => $todos->total(),
            'per_page' => $todos->perPage(),
            'current_page' => $todos->currentPage(),
            'last_page' => $todos->lastPage(),
        ],
    ]);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Api/TodoByTagApiTest.php`
Expected: PASS (5 tests).

- [ ] **Step 6: Run the neighbouring API suites for regressions**

Run: `php artisan test tests/Feature/Api`
Expected: PASS, including `RouteResolutionTest` (proves the literal segment still resolves).

- [ ] **Step 7: Document the endpoint**

Append to `docs/reference/API_DOCUMENTATION.md`:

```php
/**
 * GET /api/v1/todos/by-tag/{tag}
 * List the todos linked to one tag, paginated.
 *
 * Path Parameters:
 * - tag: numeric tag id
 *
 * Query Parameters:
 * - per_page: 1..100 (default 50)
 * - page: page number (default 1)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [ ...todos ],
 *   "pagination": { "total": 12, "per_page": 50, "current_page": 1, "last_page": 1 }
 * }
 *
 * Example: GET /api/v1/todos/by-tag/57?per_page=20
 */
```

- [ ] **Step 8: Commit**

```bash
git add routes/api.php app/Http/Controllers/Api/TodoController.php tests/Feature/Api/TodoByTagApiTest.php docs/reference/API_DOCUMENTATION.md
git commit -m "feat(api): add paginated tag-scoped todo listing endpoint"
```

---

### Task 2: Verify against the live `area:factory` tag

**Files:** none (verification only).

**Interfaces:**
- Consumes: the deployed `GET /api/v1/todos/by-tag/{tag}` from Task 1.

- [ ] **Step 1: Confirm the tag id and count**

Use the Zettly MCP `zettly_api` tool: `GET /api/v1/tags/57` and read `todos_count`.

- [ ] **Step 2: Fetch the tag's todos through the new endpoint**

Call `GET /api/v1/todos/by-tag/57?per_page=100` and confirm `pagination.total` matches the tag count and every returned todo carries the `area:factory` tag.

- [ ] **Step 3: Report the list to the owner**

List the todo ids and titles. Do not archive or delete anything; that is a separate confirmed action.
