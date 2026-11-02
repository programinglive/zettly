<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JournalPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_journal_page_is_reachable_instead_of_404(): void
    {
        // /journal returned 404 even though the imported entries existed and were
        // served by the API: there was no web page at all.
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/journal')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Journal/Index'));
    }

    public function test_it_lists_only_the_signed_in_users_entries(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        JournalEntry::create([
            'user_id' => $me->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'my own work',
            'source' => 'legacy-markdown',
        ]);
        JournalEntry::create([
            'user_id' => $other->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'someone else work',
            'source' => 'legacy-markdown',
        ]);

        $this->actingAs($me)
            ->get('/journal')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.preview', 'my own work')
            );
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/journal')->assertRedirect('/login');
    }

    public function test_it_filters_by_kind(): void
    {
        $user = User::factory()->create();

        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'activity text',
        ]);
        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_DECISION, 'content' => 'decision text',
        ]);

        $this->actingAs($user)
            ->get('/journal?kind=decision')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries.data', 1)
                ->where('entries.data.0.kind', 'decision')
            );
    }

    public function test_the_timeline_sends_a_preview_not_the_whole_entry(): void
    {
        // Entries average 64 KB and reach 225 KB. Sending them whole made the page
        // a 1.35 MB response, and the template truncated them to 320 characters
        // anyway - so the rest of every entry was unreachable.
        $user = User::factory()->create();
        $long = str_repeat('x', 5000).'TAIL-MARKER';

        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => $long,
        ]);

        $this->actingAs($user)
            ->get('/journal')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('entries.data.0.length', strlen($long))
                ->where('entries.data.0.preview', fn ($value) => is_string($value)
                    && mb_strlen($value) <= 420
                    && ! str_contains($value, 'TAIL-MARKER'))
            );
    }

    public function test_an_entry_can_be_opened_in_full_by_its_owner(): void
    {
        $user = User::factory()->create();
        $content = str_repeat('body ', 1000).'TAIL-MARKER';
        $entry = JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => $content,
        ]);

        $this->actingAs($user)
            ->getJson("/journal/{$entry->id}")
            ->assertOk()
            ->assertJsonPath('id', $entry->id)
            ->assertJsonPath('content', $content);
    }

    public function test_one_user_cannot_open_another_users_entry(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $entry = JournalEntry::create([
            'user_id' => $other->id, 'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'private',
        ]);

        $this->actingAs($me)
            ->getJson("/journal/{$entry->id}")
            ->assertForbidden();
    }

    public function test_the_header_range_is_sent_as_dates_not_wrapped_objects(): void
    {
        // The dates came from optional(min(...)) / optional(max(...)). optional()
        // returns an Optional object for any non-null value, so the page rendered
        // "[object Object] → [object Object]" next to the entry count.
        $user = User::factory()->create();

        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-09-01',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'first day',
        ]);
        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-15',
            'kind' => JournalEntry::KIND_ACTIVITY, 'content' => 'last day',
        ]);

        $this->actingAs($user)
            ->get('/journal')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 2)
                ->where('stats.first', fn ($value) => is_string($value) && str_starts_with($value, '2026-09-01'))
                ->where('stats.last', fn ($value) => is_string($value) && str_starts_with($value, '2026-10-15'))
            );
    }
}
