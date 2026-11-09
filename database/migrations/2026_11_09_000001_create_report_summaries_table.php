<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * report_summaries stores the structured recap of each report (the human
     * digest line plus the headline metrics) so the UI can read recaps
     * without re-parsing - or ever rewriting - the raw report content.
     */
    public function up(): void
    {
        Schema::create('report_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->index();
            $table->string('period_kind', 10);
            $table->date('period_start');
            $table->date('period_end');
            $table->text('digest')->nullable();
            $table->unsignedInteger('active_minutes')->default(0);
            $table->unsignedInteger('tasks_completed')->default(0);
            $table->unsignedInteger('tasks_open')->default(0);
            $table->json('projects_minutes')->nullable();
            $table->json('categories')->nullable();
            $table->json('tags')->nullable();
            $table->json('machines')->nullable();
            $table->timestamps();

            $table->unique('report_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_summaries');
    }
};
