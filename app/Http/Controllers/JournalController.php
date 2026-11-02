<?php

namespace App\Http\Controllers;

use App\Models\JournalEntry;
use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class JournalController extends Controller
{
    /**
     * The journal timeline: every recorded activity entry for the signed-in user.
     *
     * The data has existed since the import, but only through the API — there
     * was no page for it, so /journal returned 404.
     */
    public function index(Request $request)
    {
        $query = JournalEntry::where('user_id', Auth::id())
            ->with('todo')
            ->orderByDesc('entry_date')
            ->orderByDesc('id');

        // Kinds the model defines: activity, decision, blocker, outcome, handoff.
        if ($request->filled('kind')) {
            $query->where('kind', $request->string('kind'));
        }

        if ($request->filled('source')) {
            $query->where('source', $request->string('source'));
        }

        if ($request->filled('from')) {
            $query->whereDate('entry_date', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('entry_date', '<=', $request->date('to'));
        }

        if ($request->filled('q')) {
            $needle = '%'.$request->string('q').'%';
            $query->where('content', 'like', $needle);
        }

        $entries = $query->paginate(20)->withQueryString();

        return Inertia::render('Journal/Index', [
            'entries' => $entries,
            'filters' => [
                'kind' => $request->get('kind'),
                'source' => $request->get('source'),
                'from' => $request->get('from'),
                'to' => $request->get('to'),
                'q' => $request->get('q'),
            ],
            'kinds' => [
                JournalEntry::KIND_ACTIVITY,
                JournalEntry::KIND_DECISION,
                JournalEntry::KIND_BLOCKER,
                JournalEntry::KIND_OUTCOME,
                JournalEntry::KIND_HANDOFF,
            ],
            'stats' => [
                'total' => JournalEntry::where('user_id', Auth::id())->count(),
                'first' => optional(JournalEntry::where('user_id', Auth::id())->min('entry_date')),
                'last' => optional(JournalEntry::where('user_id', Auth::id())->max('entry_date')),
            ],
            'tags' => Tag::forUser(Auth::id())->get(),
        ]);
    }
}
