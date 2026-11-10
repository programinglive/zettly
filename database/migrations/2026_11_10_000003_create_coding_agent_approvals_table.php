<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coding_agent_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coding_agent_job_id')->constrained('coding_agent_jobs')->cascadeOnDelete();
            $table->foreignId('approved_by')->constrained('users')->cascadeOnDelete();
            $table->string('repository', 120);
            $table->string('target_environment', 80);
            $table->string('commit_sha', 64);
            $table->timestamps();
            $table->unique(['coding_agent_job_id', 'repository', 'target_environment', 'commit_sha'], 'coding_agent_approvals_exact_commit_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coding_agent_approvals');
    }
};
