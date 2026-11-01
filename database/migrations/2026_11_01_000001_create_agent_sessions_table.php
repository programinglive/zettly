<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agent_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('session_id', 191);
            $table->string('project', 80);
            $table->string('title', 180);
            $table->string('category', 40)->default('Development');
            $table->string('status', 20)->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('last_activity_at');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->json('files_changed')->nullable();
            $table->json('errors')->nullable();
            $table->text('outcome')->nullable();
            $table->string('machine', 80)->default('unknown');
            $table->timestamps();

            $table->unique(['user_id', 'session_id']);
            $table->index(['user_id', 'started_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_sessions');
    }
};
