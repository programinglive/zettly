<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A day's committed work.
 *
 * The limit and capacity are snapshotted on the plan so history stays truthful
 * after the user changes their settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('daily_plans')) {
            Schema::create('daily_plans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->date('plan_date');
                $table->unsignedSmallInteger('wip_limit_snapshot')->default(3);
                $table->unsignedInteger('capacity_minutes_snapshot')->default(240);
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'plan_date'], 'daily_plans_user_date_unique');
            });
        }

        if (Schema::hasTable('daily_plan_items')) {
            return;
        }

        Schema::create('daily_plan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('todo_id')->constrained('todos')->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);
            $table->string('state', 10)->default('planned');
            $table->string('reason', 500)->nullable();
            $table->timestamps();

            $table->unique(['daily_plan_id', 'todo_id'], 'daily_plan_items_plan_todo_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_plan_items');
        Schema::dropIfExists('daily_plans');
    }
};
