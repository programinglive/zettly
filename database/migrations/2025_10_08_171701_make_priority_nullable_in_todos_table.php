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
            // For PostgreSQL, we need to drop and recreate the column
            $table->dropColumn('priority');
        });
        
        Schema::table('todos', function (Blueprint $table) {
            // Add priority column as nullable enum
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->nullable()->default('medium')->after('description');
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
            // Restore non-nullable priority column
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->after('description');
        });
    }
};
