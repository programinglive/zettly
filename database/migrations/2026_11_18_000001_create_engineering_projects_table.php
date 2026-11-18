<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('engineering_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 80);
            $table->string('name', 120);
            $table->string('provider', 24)->default('github');
            $table->string('repo_full_name', 160);
            $table->string('default_branch', 80)->default('main');
            $table->string('environment', 40)->default('production');
            $table->string('target_url', 255)->nullable();
            $table->string('latest_release_tag', 64)->nullable();
            $table->string('latest_release_sha', 64)->nullable();
            $table->string('deployed_tag', 64)->nullable();
            $table->string('deployed_commit', 64)->nullable();
            $table->string('runtime_health_status', 32)->default('not_connected');
            $table->string('github_status', 32)->default('not_connected');
            $table->string('mcp_status', 32)->default('not_connected');
            $table->string('mcp_version', 64)->nullable();
            $table->unsignedInteger('mcp_tools_count')->default(0);
            $table->unsignedInteger('mcp_prompts_count')->default(0);
            $table->string('blocking_incident', 255)->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
            $table->index(['user_id', 'repo_full_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('engineering_projects');
    }
};
