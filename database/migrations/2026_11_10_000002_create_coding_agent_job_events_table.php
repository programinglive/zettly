<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coding_agent_job_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coding_agent_job_id')->constrained('coding_agent_jobs')->cascadeOnDelete();
            $table->string('event_key', 64);
            $table->string('kind', 40);
            $table->text('detail')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->unique(['coding_agent_job_id', 'event_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coding_agent_job_events');
    }
};
