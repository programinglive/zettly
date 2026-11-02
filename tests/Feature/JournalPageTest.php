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
                ->where('entries.data.0.content', 'my own work')
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
