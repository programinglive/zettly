<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            $table->string('role', 64)->default('developer')->after('repository');
            $table->string('execution_mode', 32)->default('code_write')->after('role');
            $table->string('routing_profile', 24)->default('STANDARD')->after('execution_mode');
            $table->unsignedBigInteger('parent_job_id')->nullable()->after('workflow_task_id');
            $table->unsignedBigInteger('handoff_from_job_id')->nullable()->after('parent_job_id');
            $table->json('artifact_output')->nullable()->after('target_environment');
            $table->string('reversibility_classification', 40)->nullable()->after('artifact_output');
            $table->string('risk_level', 24)->nullable()->after('reversibility_classification');
            $table->json('reversibility_assessment')->nullable()->after('risk_level');
            $table->string('delivery_stage', 40)->nullable()->after('reversibility_assessment');
            $table->string('merge_sha', 64)->nullable()->after('delivery_stage');
            $table->string('release_tag', 40)->nullable()->after('merge_sha');
            $table->string('artifact_digest', 80)->nullable()->after('release_tag');
            $table->string('production_revision', 64)->nullable()->after('artifact_digest');
            $table->json('delivery_state')->nullable()->after('production_revision');

            $table->index(['user_id', 'workflow_task_id']);
            $table->index(['user_id', 'role', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'workflow_task_id']);
            $table->dropIndex(['user_id', 'role', 'status']);
            $table->dropColumn([
                'role',
                'execution_mode',
                'routing_profile',
                'parent_job_id',
                'handoff_from_job_id',
                'artifact_output',
                'reversibility_classification',
                'risk_level',
                'reversibility_assessment',
                'delivery_stage',
                'merge_sha',
                'release_tag',
                'artifact_digest',
                'production_revision',
                'delivery_state',
            ]);
        });
    }
};
