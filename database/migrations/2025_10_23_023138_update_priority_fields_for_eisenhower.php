<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function () {
            // Ensure columns exist even if prior migrations failed on lightweight drivers.
            if (! Schema::hasColumn('todos', 'priority')) {
                Schema::table('todos', function (Blueprint $table) {
                    $table->string('priority', 50)->nullable()->default('not_urgent')->after('description');
                });
            }

            if (! Schema::hasColumn('todos', 'importance')) {
                Schema::table('todos', function (Blueprint $table) {
                    $table->string('importance', 50)->nullable()->default('not_important')->after('priority');
                });
            }

            // Normalize legacy values for todos only (notes keep null priority/importance).
            DB::table('todos')
                ->where('type', 'todo')
                ->update([
                    'priority' => DB::raw("CASE WHEN priority IN ('urgent', 'high') THEN 'urgent' ELSE 'not_urgent' END"),
                    'importance' => DB::raw("CASE WHEN importance IN ('important', 'high') THEN 'important' ELSE 'not_important' END"),
                ]);

            // Allow notes to keep null values.
            DB::table('todos')
                ->where('type', 'note')
                ->update([
                    'priority' => null,
                    'importance' => null,
                ]);

            $driver = DB::getDriverName();

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE todos MODIFY COLUMN priority ENUM('not_urgent','urgent') NULL DEFAULT 'not_urgent'");
                DB::statement("ALTER TABLE todos MODIFY COLUMN importance ENUM('not_important','important') NULL DEFAULT 'not_important'");
            } elseif ($driver === 'pgsql') {
                DB::statement("ALTER TABLE todos ALTER COLUMN priority TYPE VARCHAR(20)");
                DB::statement("ALTER TABLE todos ALTER COLUMN priority SET DEFAULT 'not_urgent'");
                DB::statement("ALTER TABLE todos ALTER COLUMN importance TYPE VARCHAR(20)");
                DB::statement("ALTER TABLE todos ALTER COLUMN importance SET DEFAULT 'not_important'");
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::transaction(function () {
            $driver = DB::getDriverName();

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE todos MODIFY COLUMN priority ENUM('low','medium','high','urgent') NULL DEFAULT 'medium'");
                DB::statement("ALTER TABLE todos MODIFY COLUMN importance ENUM('low','high') NULL DEFAULT 'low'");
            } elseif ($driver === 'pgsql') {
                DB::statement("ALTER TABLE todos ALTER COLUMN priority TYPE VARCHAR(20)");
                DB::statement("ALTER TABLE todos ALTER COLUMN priority SET DEFAULT 'medium'");
                DB::statement("ALTER TABLE todos ALTER COLUMN importance TYPE VARCHAR(20)");
                DB::statement("ALTER TABLE todos ALTER COLUMN importance SET DEFAULT 'low'");
            }
        });
    }
};
