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
        Schema::create('todo_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_todo_id')->constrained('todos')->cascadeOnDelete();
            $table->string('relationship_type')->default('related'); // 'related', 'parent', 'child', 'blocks', 'blocked_by', etc.
            $table->timestamps();

            $table->unique(['todo_id', 'related_todo_id', 'relationship_type']);
            $table->index(['todo_id', 'relationship_type']);
            $table->index(['related_todo_id', 'relationship_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('todo_relationships');
    }
};
