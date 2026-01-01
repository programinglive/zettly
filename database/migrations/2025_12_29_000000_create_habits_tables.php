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
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('organization_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('color')->default('#6B7280'); // gray-500 default for two-color design
            $table->string('icon')->default('circle'); // lucide icon name
            $table->integer('target_frequency'); // times per period
            $table->enum('frequency_period', ['daily', 'weekly', 'monthly'])->default('daily');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index(['user_id', 'is_active']);
            $table->index(['organization_id', 'is_active']);
        });

        Schema::create('habit_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->integer('count')->default(1); // for habits that can be done multiple times per day
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Ensure one entry per habit per date (for single completion habits)
            $table->unique(['habit_id', 'date']);
            $table->index(['habit_id', 'date']);
        });

        Schema::create('habit_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_id')->constrained()->onDelete('cascade');
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_completion_date')->nullable();
            $table->timestamps();
            
            $table->unique('habit_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('habit_streaks');
        Schema::dropIfExists('habit_entries');
        Schema::dropIfExists('habits');
    }
};
