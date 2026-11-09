<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tags for drawings and journal entries.
 *
 * WHY (owner instruction, 10 November 2026)
 * -----------------------------------------
 * "Everything must have a tag, because we adopted the zettelkasten method so we
 * have relations between all our knowledge." Until now only `todo_tag` existed,
 * so a drawing or a journal entry could not be related to anything, and the
 * backfill had nowhere to write.
 *
 * The shape deliberately mirrors `todo_tag` (id, foreign ids, timestamps, unique
 * pair) so every tag join in the application behaves the same way.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drawing_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drawing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['drawing_id', 'tag_id']);
        });

        Schema::create('journal_entry_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['journal_entry_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entry_tag');
        Schema::dropIfExists('drawing_tag');
    }
};
