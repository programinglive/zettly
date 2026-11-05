<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_details_require_the_owner_and_escape_untrusted_content(): void
    {
        $owner = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $owner->id,
            'content' => "# Summary\n<script>alert(1)</script>\nBearer example-secret",
        ]);

        $this->get('/reports/'.$report->id)->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/reports/'.$report->id)->assertNotFound();
        $this->actingAs($owner)->get('/reports/'.$report->id)->assertOk()
            ->assertSee('Summary')->assertDontSee('<script>', false)->assertDontSee('example-secret');
    }
}
