<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Additive columns the priority engine reads from a todo.
 *
 * `queue_state` defaults to `inbox` so nothing new enters the daily queue by
 * accident. Existing open rows are moved to `backlog` on the same migration: they
 * were already accepted by the owner, and leaving them in `inbox` would dump 129
 * tasks into triage at once. Priority, quadrant and completion values are never
 * touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('todos', 'queue_state')) {
            Schema::table('todos', function (Blueprint $table) {
                $table->string('queue_state', 12)->default('inbox');
                $table->unsignedInteger('estimate_minutes')->nullable();
                $table->timestamp('triaged_at')->nullable();
                $table->boolean('is_p0')->default(false);
                $table->string('p0_reason', 500)->nullable();
                $table->timestamp('p0_since')->nullable();
                $table->timestamp('p0_expires_at')->nullable();
                $table->unsignedBigInteger('p0_by')->nullable();

                $table->index(['user_id', 'queue_state', 'is_completed'], 'todos_queue_state_index');
                $table->index(['user_id', 'is_p0', 'p0_expires_at'], 'todos_p0_index');
            });
        }

        DB::table('todos')
            ->whereIn('type', ['todo'])
            ->whereNull('deleted_at')
            ->where('is_completed', false)
            ->where('queue_state', 'inbox')
            ->update(['queue_state' => 'backlog']);
    }

    public function down(): void
    {
        if (! Schema::hasColumn('todos', 'queue_state')) {
            return;
        }

        Schema::table('todos', function (Blueprint $table) {
            $table->dropIndex('todos_queue_state_index');
            $table->dropIndex('todos_p0_index');
            $table->dropColumn([
                'queue_state',
                'estimate_minutes',
                'triaged_at',
                'is_p0',
                'p0_reason',
                'p0_since',
                'p0_expires_at',
                'p0_by',
            ]);
        });
    }
};
