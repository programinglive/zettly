<?php

namespace App\Http\Controllers;

use App\Models\Focus;
use App\Models\FocusStatusEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FocusController extends Controller
{
    /**
     * Get current focus for the authenticated user.
     */
    public function current(Request $request): JsonResponse
    {
        $dateString = $request->query('date');
        $filterDate = Carbon::today();

        if ($dateString) {
            try {
                $filterDate = Carbon::createFromFormat('Y-m-d', $dateString)->startOfDay();
            } catch (\Exception $exception) {
                $filterDate = Carbon::today();
            }
        }

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
            ->whereDate('created_at', $filterDate)
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
            'filter_date' => $filterDate->toDateString(),
            // Several focuses may run at once; a client needs to know that the
            // single focus returned in `data` is not the only one.
            'active_focus_count' => Auth::user()->activeFoci()->count(),
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
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            // A focus cannot be born paused or already finished.
            'status' => ['sometimes', 'nullable', Rule::in([Focus::STATUS_ACTIVE])],
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
            'color' => $request->input('color') ?? Focus::DEFAULT_COLOR,
            'status' => Focus::STATUS_ACTIVE,
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
     * Update an existing focus.
     */
    public function update(Request $request, Focus $focus): JsonResponse
    {
        // Ensure user can only update their own focus
        if ($focus->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        if ($focus->isCompleted()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update a completed focus',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $focus->update([
            'title' => $request->title,
            'description' => $request->description,
            'color' => $request->input('color') ?? $focus->color,
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
        ]);
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
            'filter_date' => 'nullable|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $filterDateString = $validated['filter_date'] ?? null;
        $filterDate = Carbon::today();

        if ($filterDateString) {
            try {
                $filterDate = Carbon::createFromFormat('Y-m-d', $filterDateString)->startOfDay();
            } catch (\Exception $exception) {
                $filterDate = Carbon::today();
            }
        }

        $focus->update([
            'completed_at' => now(),
            'status' => Focus::STATUS_COMPLETED,
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
            ->whereDate('created_at', $filterDate)
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
            'filter_date' => $filterDate->toDateString(),
        ]);
    }

    /**
     * Move a focus between active, paused and completed.
     *
     * `foci.status` is the current state that queries filter on;
     * `focus_status_events` stays the append-only audit trail. Both are written
     * in one transaction so they can never disagree.
     */
    public function updateStatus(Request $request, Focus $focus): JsonResponse
    {
        if ($focus->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => ['required', Rule::in([
                Focus::STATUS_ACTIVE,
                Focus::STATUS_PAUSED,
                Focus::STATUS_COMPLETED,
            ])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($focus->isCompleted() && $request->status !== Focus::STATUS_COMPLETED) {
            return response()->json([
                'success' => false,
                'message' => 'A completed focus cannot be reopened',
            ], 400);
        }

        $status = $request->status;

        if ($status === $focus->status) {
            return response()->json([
                'success' => true,
                'data' => $focus,
                'changed' => false,
            ]);
        }

        $action = $status === Focus::STATUS_COMPLETED
            ? 'completed'
            : ($status === Focus::STATUS_PAUSED ? 'paused' : 'resumed');

        DB::transaction(function () use ($focus, $status, $action, $request) {
            $focus->update([
                'status' => $status,
                'completed_at' => $status === Focus::STATUS_COMPLETED ? now() : null,
            ]);

            FocusStatusEvent::create([
                'focus_id' => $focus->id,
                'user_id' => Auth::id(),
                'action' => $action,
                'reason' => $request->input('reason')
                    ?: "Focus moved to {$status}",
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => $focus->fresh(['statusEvents']),
            'changed' => true,
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
