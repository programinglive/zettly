<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coding_agent_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('todo_id')->constrained()->cascadeOnDelete();
            $table->string('workflow_task_id', 64)->nullable();
            $table->string('repository', 120);
            $table->text('instruction');
            $table->string('client_request_id', 100);
            $table->string('status', 32)->default('queued');
            $table->string('lease_token_hash', 64)->nullable();
            $table->timestamp('leased_until')->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->string('branch', 191)->nullable();
            $table->string('commit_sha', 64)->nullable();
            $table->string('pr_url', 2048)->nullable();
            $table->text('test_summary')->nullable();
            $table->boolean('tests_passed')->nullable();
            $table->string('target_environment', 80)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'client_request_id']);
            $table->index(['status', 'leased_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coding_agent_jobs');
    }
};
