<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Events\TLDrawUpdated;
use App\Events\UserJoinedDrawing;
use App\Events\UserLeftDrawing;

class TLDrawSyncController extends Controller
{
    /**
     * Authenticate WebSocket connection for TLDraw sync
     */
    public function authenticate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'roomId' => 'required|string',
            'client' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid parameters'], 400);
        }

        $roomId = $request->input('roomId');
        $clientId = $request->input('client');

        // Extract drawing ID from room ID (format: drawing-{id})
        if (!preg_match('/^drawing-(\d+)$/', $roomId, $matches)) {
            return response()->json(['error' => 'Invalid room format'], 400);
        }

        $drawingId = $matches[1];
        $drawing = Drawing::findOrFail($drawingId);

        // Check if user has access to this drawing
        if ($drawing->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Generate authentication token for WebSocket
        $token = [
            'roomId' => $roomId,
            'clientId' => $clientId,
            'userId' => Auth::id(),
            'drawingId' => $drawingId,
            'exp' => now()->addMinutes(60)->timestamp, // Token expires in 1 hour
        ];

        $signedToken = hash_hmac('sha256', json_encode($token), config('app.key'));

        return response()->json([
            'token' => $signedToken,
            'user' => [
                'id' => Auth::id(),
                'name' => Auth::user()->name,
                'color' => $this->getUserColor(Auth::id()),
            ],
        ]);
    }

    /**
     * Load initial document state
     */
    public function loadDocument(Request $request, $drawingId): JsonResponse
    {
        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        return response()->json([
            'document' => $drawing->document,
            'version' => $drawing->updated_at?->timestamp ?? time(),
        ]);
    }

    /**
     * Save document state
     */
    public function saveDocument(Request $request, $drawingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document' => 'required|array',
            'version' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid document data'], 400);
        }

        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $drawing->document = $request->input('document');
        $drawing->save();

        return response()->json([
            'success' => true,
            'version' => $drawing->updated_at?->timestamp ?? time(),
        ]);
    }

    /**
     * Handle real-time document updates
     */
    public function updateDocument(Request $request, $drawingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document' => 'required|array',
            'clientId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid document data'], 400);
        }

        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $drawing->document = $request->input('document');
        $drawing->save();

        // Broadcast update to other clients
        broadcast(new TLDrawUpdated($drawing, Auth::user(), $request->input('document')));

        return response()->json([
            'success' => true,
            'version' => $drawing->updated_at?->timestamp ?? time(),
        ]);
    }

    /**
     * Upload asset (image/file)
     */
    public function uploadAsset(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // Max 10MB
            'drawingId' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid file'], 400);
        }

        $drawing = Drawing::where('id', $request->input('drawingId'))
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $file = $request->file('file');
        $path = $file->store('drawings/assets', 'public');

        return response()->json([
            'url' => Storage::url($path),
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'type' => $file->getMimeType(),
        ]);
    }

    /**
     * Get user presence info
     */
    public function getPresence(Request $request, $drawingId): JsonResponse
    {
        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        // In a real implementation, you'd store active users in Redis or database
        // For now, return current user info
        return response()->json([
            'users' => [
                [
                    'id' => Auth::id(),
                    'name' => Auth::user()->name,
                    'color' => $this->getUserColor(Auth::id()),
                    'cursor' => null, // Would be stored in Redis
                ],
            ],
        ]);
    }

    /**
     * Update user presence (cursor position, selection)
     */
    public function updatePresence(Request $request, $drawingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cursor' => 'nullable|array',
            'selection' => 'nullable|array',
            'clientId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid presence data'], 400);
        }

        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        // Store presence in Redis for real-time updates
        $presenceData = [
            'userId' => Auth::id(),
            'userName' => Auth::user()->name,
            'userColor' => $this->getUserColor(Auth::id()),
            'cursor' => $request->input('cursor'),
            'selection' => $request->input('selection'),
            'updatedAt' => now()->timestamp,
        ];

        // TODO: Store in Redis with TTL
        // Redis::setex("drawing:{$drawingId}:presence:" . Auth::id(), 300, json_encode($presenceData));

        // Broadcast presence update
        broadcast(new \App\Events\PresenceUpdated($drawing, Auth::user(), $presenceData));

        return response()->json(['success' => true]);
    }

    /**
     * Join drawing (for presence)
     */
    public function joinDrawing(Request $request, $drawingId): JsonResponse
    {
        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $userData = [
            'id' => Auth::id(),
            'name' => Auth::user()->name,
            'color' => $this->getUserColor(Auth::id()),
        ];

        // Broadcast that user joined
        broadcast(new UserJoinedDrawing($drawing, Auth::user()));

        return response()->json([
            'success' => true,
            'user' => $userData,
        ]);
    }

    /**
     * Leave drawing (for presence)
     */
    public function leaveDrawing(Request $request, $drawingId): JsonResponse
    {
        $drawing = Drawing::where('id', $drawingId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        // Broadcast that user left
        broadcast(new UserLeftDrawing($drawing, Auth::user()));

        return response()->json(['success' => true]);
    }

    /**
     * Generate a consistent color for each user
     */
    private function getUserColor($userId): string
    {
        $colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        ];
        
        return $colors[$userId % count($colors)];
    }
}
