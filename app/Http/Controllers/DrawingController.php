<?php

namespace App\Http\Controllers;

use App\Events\DrawingUpdated;
use App\Models\Drawing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class DrawingController extends Controller
{
    public function index(Request $request): Response
    {
        $drawings = Drawing::query()
            ->select(['id', 'title', 'updated_at'])
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
        ]);

        $validated = $validator->validate();

        $drawing = Drawing::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'document' => $validated['document'],
        ]);

        // Broadcast the new drawing
        broadcast(new DrawingUpdated($drawing));

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

    public function show(Drawing $drawing): JsonResponse
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        return response()->json([
            'success' => true,
            'drawing' => $drawing,
        ]);
    }

    public function update(Request $request, Drawing $drawing): JsonResponse
    {
        if ($drawing->user_id !== Auth::id()) {
            abort(403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'document' => 'required|array',
        ]);

        $validated = $validator->validate();

        $drawing->update($validated);

        // Broadcast the updated drawing
        broadcast(new DrawingUpdated($drawing));

        return response()->json([
            'success' => true,
            'drawing' => $drawing,
        ]);
    }
}
