<?php

namespace App\Http\Controllers;

use App\Events\DrawingUpdated;
use App\Http\Requests\Concerns\ValidatesFocusOwnership;
use App\Mail\DrawingCreated as DrawingCreatedMail;
use App\Mail\DrawingDeleted as DrawingDeletedMail;
use App\Mail\DrawingUpdated as DrawingUpdatedMail;
use App\Models\Drawing;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class DrawingController extends Controller
{
    use ValidatesFocusOwnership;
    public function index(Request $request): Response
    {
        $drawings = Drawing::query()
            ->select(['id', 'title', 'updated_at', 'thumbnail'])
            // Tags load with the list. Without this the gallery had no way to
            // show the zettelkasten relations a drawing takes part in, even
            // though the pivot has held them since 10 November 2026.
            ->with('tags:id,name,color')
            ->where('user_id', Auth::id())
            ->latest()
            ->get();

        return Inertia::render('Draw/Index', [
            'drawings' => $drawings,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'document' => 'required|array',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'integer',
            'focus_id' => ['sometimes', 'nullable', 'integer', $this->ownedFocusRule()],
        ]);

        $validated = $validator->validate();

        $drawing = Drawing::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'document' => $validated['document'],
            'thumbnail' => $request->input('thumbnail'),
            'focus_id' => $validated['focus_id'] ?? null,
        ]);

        // Tags, so a drawing takes part in the zettelkasten relations the same
        // way a Todo does (added 10 November 2026). Only tags owned by the
        // caller are attached; an id belonging to someone else is dropped.
        if (! empty($validated['tag_ids'])) {
            $owned = Tag::whereIn('id', $validated['tag_ids'])
                ->where('user_id', Auth::id())
                ->pluck('id')
                ->all();
            if ($owned) {
                $drawing->tags()->syncWithoutDetaching($owned);
            }
        }

        $drawing = $drawing->fresh(['user', 'tags']);

        // Broadcast the new drawing
        broadcast(new DrawingUpdated($drawing, true));

        if ($drawing->user?->email) {
            try {
                Mail::to($drawing->user)->queue(new DrawingCreatedMail($drawing));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return response()->json([
            'success' => true,
            'drawing' => $drawing,
        ], 201);
    }

    public function test(Drawing $drawing): Response
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        return Inertia::render('Draw/WebSocketTest', [
            'drawing' => $drawing,
            'appVersion' => config('app.version', 'unknown'),
        ]);
    }

    public function show(Request $request, Drawing $drawing): Response|JsonResponse
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        if ($request->expectsJson() && ! $request->hasHeader('X-Inertia')) {
            return response()->json([
                'success' => true,
                'drawing' => $drawing->only(['id', 'title', 'document', 'thumbnail', 'updated_at']),
            ]);
        }

        return Inertia::render('Draw/Index', [
            'drawing' => $drawing,
        ]);
    }

    public function update(Request $request, Drawing $drawing): JsonResponse
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|nullable|string|max:255',
            'document' => 'sometimes|array',
            'thumbnail' => 'sometimes|nullable|string',
            'tag_ids' => 'sometimes|array',
            'tag_ids.*' => 'integer',
            'focus_id' => ['sometimes', 'nullable', 'integer', $this->ownedFocusRule()],
        ])->after(function ($validator) use ($request) {
            if (! $request->hasAny(['title', 'document', 'thumbnail', 'tag_ids', 'focus_id'])) {
                $validator->errors()->add('payload', 'At least one field (title, document, tag_ids or focus_id) is required.');
            }
        });

        $validated = $validator->validate();

        $documentChanged = array_key_exists('document', $validated);
        // tag_ids is a relation, not a column: strip it before update().
        unset($validated['tag_ids']);

        $drawing->update($validated);

        if ($request->has('tag_ids')) {
            $owned = Tag::whereIn('id', (array) $request->input('tag_ids'))
                ->where('user_id', Auth::id())
                ->pluck('id')
                ->all();
            $drawing->tags()->sync($owned);
        }
        $drawing->refresh();
        $drawing->loadMissing('user');

        // Broadcast the updated drawing
        broadcast(new DrawingUpdated($drawing, $documentChanged));

        if ($drawing->user?->email) {
            try {
                Mail::to($drawing->user)->queue(new DrawingUpdatedMail($drawing));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return response()->json([
            'success' => true,
            'drawing' => $drawing,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Draw/Index');
    }

    public function destroy(Drawing $drawing): JsonResponse
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        $drawing->loadMissing('user');

        if ($drawing->user?->email) {
            try {
                Mail::to($drawing->user)->queue(new DrawingDeletedMail($drawing));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $drawing->delete();

        return response()->json([
            'success' => true,
        ]);
    }
}
