<?php

namespace App\Http\Controllers\Api;

use App\Models\JournalEntry;
use App\Services\AgentSessionIngestor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class JournalController
{
    private const KINDS = [
        JournalEntry::KIND_ACTIVITY,
        JournalEntry::KIND_DECISION,
        JournalEntry::KIND_BLOCKER,
        JournalEntry::KIND_OUTCOME,
        JournalEntry::KIND_HANDOFF,
    ];

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'entry_date' => ['required', 'date_format:Y-m-d'],
            'kind' => ['required', Rule::in(self::KINDS)],
            'content' => ['required', 'string'],
            'source' => ['sometimes', 'nullable', 'string', 'max:20'],
            'todo_id' => ['sometimes', 'nullable', 'integer', Rule::exists('todos', 'id')->where('user_id', Auth::id())],
        ]);

        $entry = JournalEntry::create([
            'user_id' => Auth::id(),
            'entry_date' => $payload['entry_date'],
            'kind' => $payload['kind'],
            'content' => AgentSessionIngestor::redact($payload['content'], 20000),
            'source' => $payload['source'] ?? 'manual',
            'todo_id' => $payload['todo_id'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $entry], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::where('user_id', Auth::id());

        if ($request->query('date')) {
            $query->whereDate('entry_date', $request->query('date'));
        }
        if ($request->query('from')) {
            $query->whereDate('entry_date', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $query->whereDate('entry_date', '<=', $request->query('to'));
        }
        if ($request->query('kind')) {
            $query->where('kind', $request->query('kind'));
        }

        $entries = $query->orderByDesc('entry_date')->orderByDesc('id')->get();

        return response()->json(['success' => true, 'data' => $entries]);
    }
}
