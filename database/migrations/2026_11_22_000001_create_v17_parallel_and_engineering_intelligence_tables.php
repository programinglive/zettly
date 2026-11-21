<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            if (! Schema::hasColumn('coding_agent_jobs', 'expected_files')) {
                $table->json('expected_files')->nullable()->after('artifact_output');
            }
            if (! Schema::hasColumn('coding_agent_jobs', 'worktree_slot')) {
                $table->string('worktree_slot', 80)->nullable()->after('expected_files');
            }
            if (! Schema::hasColumn('coding_agent_jobs', 'integration_status')) {
                $table->string('integration_status', 40)->nullable()->after('worktree_slot');
            }
            if (! Schema::hasColumn('coding_agent_jobs', 'token_budget')) {
                $table->unsignedInteger('token_budget')->nullable()->after('integration_status');
            }
        });

        if (! Schema::hasTable('engineering_retrospectives')) {
            Schema::create('engineering_retrospectives', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('period_kind', 20); // daily, weekly, monthly
                $table->string('period_key', 32); // YYYY-MM-DD, YYYY-Www, YYYY-MM
                $table->string('timezone', 40)->default('Asia/Jakarta');
                $table->timestamp('period_start');
                $table->timestamp('period_end');
                $table->string('title', 200);
                $table->unsignedInteger('version')->default(1);
                $table->string('status', 30)->default('published'); // published, no_activity
                $table->json('metrics');
                $table->json('sections');
                $table->text('markdown_content');
                $table->json('version_history')->nullable();
                $table->timestamp('generated_at');
                $table->timestamp('regenerated_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'period_kind', 'period_key'], 'eng_retro_user_kind_key_unique');
            });
        }

        if (! Schema::hasTable('engineering_improvements')) {
            Schema::create('engineering_improvements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('fingerprint', 64);
                $table->string('action_code', 40);
                $table->string('title', 200);
                $table->text('description');
                $table->string('owner_role', 60)->default('ai_cto');
                $table->string('priority', 10)->default('P1'); // P0, P1, P2, P3
                $table->string('status', 40)->default('OBSERVED');
                $table->unsignedInteger('occurrence_count')->default(1);
                $table->string('source_period_key', 32)->nullable();
                $table->text('expected_outcome')->nullable();
                $table->text('verification_criteria')->nullable();
                $table->json('evidence')->nullable();
                $table->json('effectiveness_metrics')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'fingerprint'], 'eng_imp_user_fingerprint_unique');
            });
        }

        if (! Schema::hasTable('engineering_lessons')) {
            Schema::create('engineering_lessons', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('fingerprint', 64);
                $table->string('title', 200);
                $table->string('category', 50)->default('incident_cause');
                $table->string('affected_system', 80)->default('zettly');
                $table->string('confidence', 30)->default('confirmed'); // confirmed, hypothesis, invalidated
                $table->text('context');
                $table->text('applicable_conditions')->nullable();
                $table->text('known_limitations')->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->unsignedBigInteger('superseded_by_id')->nullable();
                $table->json('source_evidence');
                $table->timestamp('recorded_at');
                $table->timestamps();

                $table->unique(['user_id', 'fingerprint'], 'eng_lesson_user_fingerprint_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('engineering_lessons');
        Schema::dropIfExists('engineering_improvements');
        Schema::dropIfExists('engineering_retrospectives');

        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            $drop = array_filter([
                Schema::hasColumn('coding_agent_jobs', 'expected_files') ? 'expected_files' : null,
                Schema::hasColumn('coding_agent_jobs', 'worktree_slot') ? 'worktree_slot' : null,
                Schema::hasColumn('coding_agent_jobs', 'integration_status') ? 'integration_status' : null,
                Schema::hasColumn('coding_agent_jobs', 'token_budget') ? 'token_budget' : null,
            ]);
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
