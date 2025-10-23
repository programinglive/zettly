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
        Schema::table('todos', function (Blueprint $table) {
            $table->dropColumn('priority');
        });

        Schema::table('todos', function (Blueprint $table) {
            $table->string('priority', 50)->nullable()->default('not_urgent')->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('todos', function (Blueprint $table) {
            $table->dropColumn('priority');
        });

        Schema::table('todos', function (Blueprint $table) {
            $table->string('priority', 50)->default('medium')->after('description');
        });
    }
};
