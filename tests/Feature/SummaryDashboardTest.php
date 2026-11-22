<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SummaryDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_unauthenticated_users_are_redirected_from_summary(): void
    {
        $this->get('/summary')->assertRedirect('/login');
    }

    public function test_authenticated_root_redirects_to_summary_while_guests_see_home(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Home/Index'));

        $user = User::factory()->create();
        $this->actingAs($user)
            ->get('/')
            ->assertRedirect(route('summary.index'));
    }

    public function test_summary_dashboard_computes_project_charts_kpis_trends_and_human_takeaway(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $tagZettly = Tag::create(['user_id' => $user->id, 'name' => 'proyek:zettly', 'color' => '#3B82F6']);
        $tagClinic = Tag::create(['user_id' => $user->id, 'name' => 'proyek:clinic', 'color' => '#10B981']);
        $tagFeature = Tag::create(['user_id' => $user->id, 'name' => 'tipe:feature', 'color' => '#8B5CF6']);

        $focus = Focus::factory()->for($user)->create(['title' => 'Zettly Executive Summary']);

        $t1 = Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $focus->id,
            'title' => 'Build summary charts',
            'is_completed' => true,
            'completed_at' => now(),
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);
        $t1->tags()->attach([$tagZettly->id, $tagFeature->id]);

        $t2 = Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $focus->id,
            'title' => 'Add project donut breakdown',
            'is_completed' => true,
            'completed_at' => now()->subDay(),
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);
        $t2->tags()->attach([$tagZettly->id]);

        $t3 = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Check clinic printer logs',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);
        $t3->tags()->attach([$tagClinic->id]);

        // Other user's data must never leak
        Todo::factory()->for($otherUser)->asTask()->create([
            'title' => 'Foreign user task',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('/summary?days=30')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Summary/Index')
                ->where('days', 30)
                ->where('summary.kpis.completed_tasks', 2)
                ->where('summary.kpis.active_projects', 2)
                ->where('summary.projects.0.key', 'zettly')
                ->where('summary.projects.0.total', 2)
                ->where('summary.projects.0.completed', 2)
                ->where('summary.projects.1.key', 'clinic')
                ->where('summary.projects.1.open', 1)
                ->has('summary.daily_trend', 30)
                ->has('summary.priority_mix')
                ->has('summary.work_types', 1)
                ->has('summary.active_focuses', 1)
                ->where('summary.takeaway', fn ($text) => is_string($text) && str_contains(strtolower($text), 'zettly'))
                ->etc()
            );
    }

    public function test_artisan_summary_cli_outputs_json_payload(): void
    {
        $user = User::factory()->create();
        $tag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:dev-workflow', 'color' => '#6366F1']);
        $todo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Ship auto focus closure',
            'is_completed' => true,
            'completed_at' => now(),
        ]);
        $todo->tags()->attach([$tag->id]);

        $this->artisan('zettly:summary', [
            '--days' => 7,
            '--user' => $user->id,
            '--json' => true,
        ])
            ->expectsOutputToContain('dev-workflow')
            ->assertSuccessful();
    }
}
