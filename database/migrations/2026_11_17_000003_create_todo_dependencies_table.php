<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Directed "must finish before" edges.
 *
 * `todo_relationships` stays as the undirected "related" link; this table is the
 * one that can answer "is this task blocked". Cycles are rejected in the service
 * layer because a database constraint cannot express reachability portably.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('todo_dependencies')) {
            return;
        }

        Schema::create('todo_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('todo_id')->constrained('todos')->cascadeOnDelete();
            $table->foreignId('depends_on_todo_id')->constrained('todos')->cascadeOnDelete();
            $table->string('source', 10)->default('api');
            $table->timestamps();

            $table->unique(['todo_id', 'depends_on_todo_id'], 'todo_dependencies_pair_unique');
            $table->index(['user_id', 'depends_on_todo_id'], 'todo_dependencies_depends_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todo_dependencies');
    }
};
