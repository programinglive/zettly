<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user policy for the priority engine.
 *
 * A missing row means the engine is off for that user, so the feature is opt-in
 * and no existing account changes behaviour on deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_priority_settings')) {
            return;
        }

        Schema::create('user_priority_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('wip_limit')->default(3);
            $table->unsignedInteger('daily_capacity_minutes')->default(240);
            $table->unsignedSmallInteger('queue_size')->default(8);
            $table->boolean('require_focus')->default(true);
            $table->boolean('require_estimate')->default(false);
            $table->unsignedSmallInteger('max_p0')->default(2);
            $table->boolean('main_work_strict')->default(true);
            $table->boolean('enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_priority_settings');
    }
};
