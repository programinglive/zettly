<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add the missing user_id indexes.
 *
 * Every list in this app filters by the authenticated user, but eight tables had no
 * index leading with user_id, so PostgreSQL had only the primary key to work with.
 * At today's sizes a sequential scan is still the cheaper plan, which is why nothing
 * felt slow; these indexes are here so that stays true as the tables grow.
 *
 * Dropped on rollback so the migration is reversible.
 */
return new class extends Migration
{
    /**
     * table => extra columns appended after user_id
     *
     * @var array<string, list<string>>
     */
    private array $indexes = [
        'todos' => ['archived', 'is_completed'],   // board/index: where user_id, not archived, task
        'drawings' => [],                          // list: where user_id
        'foci' => [],                              // current focus: where user_id
        'focus_status_events' => [],               // per-focus event stream
        'todo_status_events' => [],                // history on a todo's page
        'agent_events' => [],                      // session events per user
        'report_deliveries' => [],                 // delivery sweep per user
        'organization_members' => [],              // membership checks by user
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $extra) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $name = $this->indexName($table, $extra);

            if ($this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($extra, $name) {
                $blueprint->index(array_merge(['user_id'], $extra), $name);
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $extra) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $name = $this->indexName($table, $extra);

            if (! $this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($name) {
                $blueprint->dropIndex($name);
            });
        }
    }

    private function indexName(string $table, array $extra): string
    {
        return $table.'_'.implode('_', array_merge(['user_id'], $extra)).'_index';
    }

    /**
     * MariaDB and PostgreSQL both allow `if not exists`, but Laravel's Blueprint
     * does not abstract it, so check the catalogue through the schema builder.
     */
    private function hasIndex(string $table, string $name): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['name'] ?? null) === $name) {
                return true;
            }
        }

        return false;
    }
};
