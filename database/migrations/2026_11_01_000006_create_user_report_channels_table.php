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
        Schema::create('user_report_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 20);
            // text, not string: the model casts this to `encrypted`, which exceeds varchar(255).
            $table->text('webhook_url');
            $table->string('chat_id', 64)->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'channel']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_report_channels');
    }
};
