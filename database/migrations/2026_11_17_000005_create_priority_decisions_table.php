<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The audit trail for every priority-changing action.
 *
 * An override without a row here is a bug: the services write the decision in
 * the same transaction as the change.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('priority_decisions')) {
            return;
        }

        Schema::create('priority_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('todo_id')->nullable();
            $table->unsignedBigInteger('focus_id')->nullable();
            $table->string('action', 32);
            $table->string('source', 10)->default('api');
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('actor_token_id')->nullable();
            $table->string('reason', 500)->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at'], 'priority_decisions_user_created_index');
            $table->index(['todo_id', 'created_at'], 'priority_decisions_todo_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('priority_decisions');
    }
};
