<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Give a focus a current state and a colour.
 *
 * `status` is stored next to `completed_at` on purpose: `completed_at` records
 * when work finished and is an audit fact, while `status` is what queries filter
 * on. A paused focus cannot be expressed by `completed_at` alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('foci', 'status')) {
            Schema::table('foci', function (Blueprint $blueprint) {
                $blueprint->string('color', 7)->default('#6366F1');
                $blueprint->string('status', 16)->default('active');
                $blueprint->index(['user_id', 'status']);
            });
        }

        // The column default applies to every existing row, including completed
        // ones, so the historical state has to be written explicitly.
        DB::table('foci')
            ->whereNotNull('completed_at')
            ->update(['status' => 'completed']);
    }

    public function down(): void
    {
        if (! Schema::hasColumn('foci', 'status')) {
            return;
        }

        Schema::table('foci', function (Blueprint $blueprint) {
            $blueprint->dropIndex('foci_user_id_status_index');
            $blueprint->dropColumn(['status', 'color']);
        });
    }
};
