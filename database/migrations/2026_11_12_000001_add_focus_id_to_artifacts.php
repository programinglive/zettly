<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link artifacts to the focus they belong to through a real foreign key.
 *
 * Before this, the only link was an HTML comment marker inside a Todo
 * description, matched by string scanning. Drawings and journal entries had no
 * link at all.
 *
 * The column is nullable and uses nullOnDelete so that deleting a focus never
 * destroys the work that was done under it.
 */
return new class extends Migration
{
    /**
     * Columns are appended without a position hint: `after()` is a no-op on
     * SQLite and PostgreSQL and only exists on MySQL.
     *
     * @var list<string>
     */
    private array $tables = ['todos', 'drawings', 'journal_entries'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, 'focus_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('focus_id')
                    ->nullable()
                    ->constrained('foci')
                    ->nullOnDelete();

                $blueprint->index(['user_id', 'focus_id']);
            });
        }
    }

    /**
     * Rollback is fully supported on PostgreSQL and MySQL, which is what
     * production runs.
     *
     * SQLite cannot drop a column that a foreign key still references, and it
     * cannot drop that foreign key without rebuilding the table. Rebuilding
     * three tables inside a rollback migration is a worse risk than leaving the
     * column behind, so on SQLite the index is removed and the column is kept.
     * `up()` is guarded with hasColumn(), so re-running the migration after such
     * a rollback is safe.
     */
    public function down(): void
    {
        $sqlite = Schema::getConnection()->getDriverName() === 'sqlite';

        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'focus_id')) {
                continue;
            }

            if ($sqlite) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->dropIndex("{$table}_user_id_focus_id_index");
                });

                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropForeign("{$table}_focus_id_foreign");
                $blueprint->dropIndex("{$table}_user_id_focus_id_index");
                $blueprint->dropColumn('focus_id');
            });
        }
    }
};
