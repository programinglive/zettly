<?php

namespace App\Http\Controllers;

use App\Models\Focus;
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
        $focus = Auth::user()->currentFocus()->first();

        return response()->json([
            'success' => true,
            'data' => $focus,
        ]);
    }

    /**
     * Get all foci for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $foci = Auth::user()->foci()->latest()->get();

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

        return response()->json([
            'success' => true,
            'data' => $focus,
        ], 201);
    }

    /**
     * Complete the current focus.
     */
    public function complete(Focus $focus): JsonResponse
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

        $focus->update([
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $focus,
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
