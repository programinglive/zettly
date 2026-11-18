<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The single protected work item for a user.
 *
 * One row per user, enforced by a portable unique index. History is not stored
 * here: every change writes a priority_decisions row instead, so the table stays
 * small and the constraint stays portable across SQLite and PostgreSQL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('main_work')) {
            return;
        }

        Schema::create('main_work', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('target_type', 10);
            $table->unsignedBigInteger('target_id');
            $table->string('reason', 500);
            $table->string('source', 10)->default('api');
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('main_work');
    }
};
