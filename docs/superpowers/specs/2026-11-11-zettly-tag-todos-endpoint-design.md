# Zettly Tag-Scoped Todo Listing Endpoint — Design

## Intent and why

A single tag can hold a small, known set of todos (for example `area:factory`
with 12 todos), but the general `GET /api/v1/todos` endpoint returns the whole
collection and trips the API client response-size limit. We need a narrow,
paginated endpoint that lists the todos of one tag so a tag can be reviewed and
cleaned up without downloading every todo the user owns.

This endpoint is the tool that unblocks the `area:factory` review after the
Factory project removal. Archiving or deleting those todos is a separate,
explicitly confirmed action.

## Goals

- `GET /api/v1/todos/by-tag/{tag}` returns the todos linked to one tag.
- Paginated so response size stays bounded.
- Consistent with existing `/api/v1` conventions (auth, ownership, JSON shape).
- Covered by a feature test.

## Non-goals

- Full-text or keyword search.
- Looking a tag up by name; the path takes the numeric tag id.
- Listing drawings, notes-by-search, or other resources.
- Any write operation.

## Anti-goals

- Returning an unbounded collection that reintroduces the size-limit failure.
- Exposing another user's todos through a guessed tag id.

## Constraints

- Route lives in the `Route::prefix('v1')->middleware(['auth:sanctum', 'abilities:zettly:cli'])`
  group in `routes/api.php`.
- Route must be registered before `Route::apiResource('todos', ...)` so the
  literal `todos/by-tag/...` segment is not swallowed by `todos/{todo}`.
- Tag ownership is `tag.user_id === auth()->id()`; otherwise `403`.
- `per_page` defaults to 50 and is capped at 100; `page` defaults to 1.

## Approaches considered

### 1. `GET /api/v1/todos/by-tag/{tag}` (chosen)

Narrow endpoint, numeric tag id in the path, pagination via `per_page`/`page`.
Simple to implement, test and document; directly serves the cleanup use case.
Trade-off: not a generic search surface.

### 2. Generic `GET /api/v1/search?q=&type=&tag=`

Flexible but large: multiple resource types, ranking, ambiguous parameters.
Overkill for a 12-todo cleanup and needs far more tests.

### 3. `GET /api/v1/todos/search?tag=&keyword=&priority=&status=`

Todo-focused but invites filter creep and maintenance of many combinations.

## Design of the chosen approach

- **Route:** `Route::get('todos/by-tag/{tag}', [TodoController::class, 'byTag'])->name('api.v1.todos.by-tag');`
- **Controller:** `App\Http\Controllers\Api\TodoController::byTag(Request $request, Tag $tag): JsonResponse`
  - Reject when `$tag->user_id !== Auth::id()` with `403 { success: false, message: 'Unauthorized' }`.
  - `$perPage = min(max((int) $request->input('per_page', 50), 1), 100)`.
  - `$page = max((int) $request->input('page', 1), 1)`.
  - Load `tags` and `checklistItems` on the paginated items, `latest()` order,
    matching the index endpoint.
  - Response: `{ success: true, data: [...], pagination: { total, per_page, current_page, last_page } }`.
- **Test:** feature test using `Sanctum::actingAs` that creates two tags and
  asserts page contents, pagination meta, ownership rejection, and the
  `per_page` cap.
- **Docs:** add a section to `docs/reference/API_DOCUMENTATION.md`.

## What is left to the builder

- Exact test names and assertions: see the implementation plan.
- Nothing else is open; the interface, status codes and response shape above
  are fixed.
