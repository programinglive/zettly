<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('engineering_pipeline_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('engineering_project_id')->constrained('engineering_projects')->cascadeOnDelete();
            $table->string('external_event_id', 160);
            $table->string('stage', 32);
            $table->string('status', 24);
            $table->string('commit_sha', 64)->nullable();
            $table->string('ref_name', 120)->nullable();
            $table->unsignedInteger('pr_number')->nullable();
            $table->string('workflow_name', 160)->nullable();
            $table->string('run_id', 64)->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->text('error_summary')->nullable();
            $table->string('source_url', 255)->nullable();
            $table->string('source_provenance', 80)->default('github');
            $table->timestamp('occurred_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['engineering_project_id', 'external_event_id'], 'eng_events_proj_ext_unique');
            $table->index(['engineering_project_id', 'stage', 'occurred_at'], 'eng_events_proj_stage_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('engineering_pipeline_events');
    }
};
