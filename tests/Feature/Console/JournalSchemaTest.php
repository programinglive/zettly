<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class JournalSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_journal_tables_exist(): void
    {
        foreach ([
            'agent_sessions', 'agent_events', 'journal_entries',
            'reports', 'report_deliveries', 'user_report_channels',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }
    }

    public function test_agent_sessions_has_the_required_columns(): void
    {
        foreach ([
            'user_id', 'session_id', 'project', 'title', 'category', 'status',
            'started_at', 'last_activity_at', 'completed_at', 'duration_seconds',
            'files_changed', 'errors', 'outcome', 'machine',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('agent_sessions', $column), "Missing column: {$column}");
        }
    }

    public function test_report_deliveries_is_unique_per_report_and_channel(): void
    {
        $indexes = collect(Schema::getIndexes('report_deliveries'))
            ->firstWhere('unique', true);

        $this->assertNotNull($indexes, 'Expected a unique index on report_deliveries.');
    }
}
