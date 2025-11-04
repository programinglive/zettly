<?php

namespace App\Http\Controllers;

use App\Models\Focus;
use App\Models\FocusStatusEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class FocusController extends Controller
{
    /**
     * Get current focus for the authenticated user.
     */
    public function current(): JsonResponse
    {
        $focus = Auth::user()
            ->currentFocus()
            ->with([
                'statusEvents' => function ($query) {
                    $query->with('user:id,name', 'focus:id,title,description,completed_at,started_at')
                        ->latest('id')
                        ->limit(10);
                },
            ])
            ->first();

        $recentEvents = FocusStatusEvent::query()
            ->where('user_id', Auth::id())
            ->with([
                'user:id,name',
                'focus:id,title,description,completed_at,started_at',
            ])
            ->latest('id')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $focus,
            'recent_events' => $recentEvents,
        ]);
    }

    /**
     * Get all foci for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $foci = Auth::user()
            ->foci()
            ->with([
                'statusEvents' => function ($query) {
                    $query->with('user:id,name')
                        ->latest('id')
                        ->limit(10);
                },
            ])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $foci,
        ]);
    }

    /**
     * Store a newly created focus.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $focus = Auth::user()->foci()->create([
            'title' => $request->title,
            'description' => $request->description,
            'started_at' => now(),
        ]);

        $focus->load([
            'statusEvents' => function ($query) {
                $query->with('user:id,name')
                    ->latest('id')
                    ->limit(10);
            },
        ]);

        return response()->json([
            'success' => true,
            'data' => $focus,
        ], 201);
    }

    /**
     * Complete the current focus.
     */
    public function complete(Request $request, Focus $focus): JsonResponse
    {
        // Ensure user can only complete their own focus
        if ($focus->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        if ($focus->isCompleted()) {
            return response()->json([
                'success' => false,
                'message' => 'Focus is already completed',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $focus->update([
            'completed_at' => now(),
        ]);

        $event = FocusStatusEvent::create([
            'focus_id' => $focus->id,
            'user_id' => Auth::id(),
            'action' => 'completed',
            'reason' => $validated['reason'],
        ]);

        $event->load([
            'user:id,name',
            'focus:id,title,description,completed_at,started_at',
        ]);

        $focus->load([
            'statusEvents' => function ($query) {
                $query->with('user:id,name', 'focus:id,title,description,completed_at,started_at')
                    ->latest('id')
                    ->limit(10);
            },
        ]);

        $recentEvents = FocusStatusEvent::query()
            ->where('user_id', Auth::id())
            ->with([
                'user:id,name',
                'focus:id,title,description,completed_at,started_at',
            ])
            ->latest('id')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $focus,
            'event' => $event,
            'recent_events' => $recentEvents,
        ]);
    }

    /**
     * Delete a focus.
     */
    public function destroy(Focus $focus): JsonResponse
    {
        // Ensure user can only delete their own focus
        if ($focus->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $focus->delete();

        return response()->json([
            'success' => true,
            'message' => 'Focus deleted successfully',
        ]);
    }
}
