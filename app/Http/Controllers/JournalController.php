<?php

namespace App\Http\Controllers;

use App\Models\JournalEntry;
use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class JournalController extends Controller
{
    /** Characters of an entry shown in the timeline preview. */
    private const PREVIEW_LENGTH = 400;

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

        // Entries are the raw agent log lines: 19 rows average 64 KB and reach
        // 225 KB, so sending them whole made /journal a 1.35 MB response. The
        // timeline only previews them, and there was no way to open one, so the
        // rest of every entry was unreachable. Send a preview plus the real
        // length, and let the detail endpoint serve the full text on demand.
        $entries->through(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'entry_date' => $entry->entry_date,
            'kind' => $entry->kind,
            'source' => $entry->source,
            'todo_id' => $entry->todo_id,
            'todo' => $entry->todo ? ['id' => $entry->todo->id, 'title' => $entry->todo->title] : null,
            'preview' => Str::limit(
                trim(preg_replace('/\s+/', ' ', (string) $entry->content)),
                self::PREVIEW_LENGTH
            ),
            'length' => mb_strlen((string) $entry->content),
        ]);

        // min()/max() return a date string or null. They were wrapped in optional(),
        // which turns any non-null value into an Optional object, so the page printed
        // "[object Object] → [object Object]" next to the entry count.
        $statsQuery = JournalEntry::where('user_id', Auth::id());

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
                'total' => (clone $statsQuery)->count(),
                'first' => (clone $statsQuery)->min('entry_date'),
                'last' => (clone $statsQuery)->max('entry_date'),
            ],
            'tags' => Tag::forUser(Auth::id())->get(),
        ]);
    }

    /**
     * A single entry, with its full content.
     *
     * The timeline sends previews because entries reach hundreds of KB; this is
     * what the "show full entry" click reads. Scoped to the owner.
     */
    public function show(JournalEntry $entry)
    {
        if ($entry->user_id !== Auth::id()) {
            abort(403);
        }

        return response()->json([
            'id' => $entry->id,
            'entry_date' => $entry->entry_date,
            'kind' => $entry->kind,
            'source' => $entry->source,
            'content' => $entry->content,
            'todo' => $entry->todo ? ['id' => $entry->todo->id, 'title' => $entry->todo->title] : null,
        ]);
    }
}
