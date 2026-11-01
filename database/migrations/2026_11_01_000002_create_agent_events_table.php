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
        Schema::create('agent_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_session_id')->constrained()->cascadeOnDelete();
            $table->string('event_key', 64);
            $table->string('kind', 40);
            $table->timestamp('occurred_at');
            $table->text('detail')->nullable();
            $table->timestamps();

            $table->unique('event_key');
            $table->index(['agent_session_id', 'occurred_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_events');
    }
};
