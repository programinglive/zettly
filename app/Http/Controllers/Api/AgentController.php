<?php

namespace App\Http\Controllers\Api;

use App\Models\AgentSession;
use App\Services\AgentSessionIngestor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AgentController
{
    private const STATUSES = [
        AgentSession::STATUS_IN_PROGRESS,
        AgentSession::STATUS_COMPLETED,
        AgentSession::STATUS_BLOCKED,
    ];

    public function __construct(private readonly AgentSessionIngestor $ingestor)
    {
    }

    /**
     * Create or update an agent session (keyed by user + session_id).
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'session_id' => ['required', 'string', 'max:191'],
            'project' => ['required', 'string', 'max:80'],
            'title' => ['required', 'string', 'max:180'],
            'category' => ['sometimes', 'nullable', 'string', 'max:40'],
            'status' => ['required', Rule::in(self::STATUSES)],
            // Optional: the v0.12.11 client only sends it on the create call.
            // On an update the ingestor keeps the first write (first write
            // wins); on a create it falls back to now(). Required here would
            // 422 every Stop update and leave the whole outbox stuck.
            'started_at' => ['sometimes', 'nullable', 'date'],
            'last_activity_at' => ['required', 'date'],
            'completed_at' => ['sometimes', 'nullable', 'date'],
            'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'files_changed' => ['sometimes', 'nullable', 'array', 'max:200'],
            'files_changed.*' => ['string', 'max:200'],
            'errors' => ['sometimes', 'nullable', 'array', 'max:50'],
            'errors.*' => ['string', 'max:300'],
            'outcome' => ['sometimes', 'nullable', 'string'],
            'machine' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $session = $this->ingestor->upsertSession(Auth::user(), $payload);

        return response()->json(['success' => true, 'data' => $session], $session->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Append an event to a session the caller owns.
     */
    public function storeEvent(Request $request, string $sessionId): JsonResponse
    {
        $session = AgentSession::where('user_id', Auth::id())
            ->where('session_id', $sessionId)
            ->firstOrFail();

        $payload = $request->validate([
            'event_key' => ['required', 'string', 'max:64'],
            'kind' => ['required', 'string', 'max:40'],
            'occurred_at' => ['required', 'date'],
            'detail' => ['sometimes', 'nullable', 'string'],
        ]);

        $created = $this->ingestor->appendEvent(Auth::user(), $session, $payload);

        return response()->json(['success' => true, 'created' => $created !== null]);
    }

    /**
     * List the caller's sessions, newest first, optionally filtered.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = min((int) $request->query('limit', 50), 200);

        $query = AgentSession::where('user_id', Auth::id());

        if ($request->query('since')) {
            $query->where('last_activity_at', '>=', $request->query('since'));
        }
        if ($request->query('project')) {
            $query->where('project', $request->query('project'));
        }
        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        $sessions = $query->orderByDesc('last_activity_at')->limit($limit)->get();

        return response()->json(['success' => true, 'data' => $sessions]);
    }
}
