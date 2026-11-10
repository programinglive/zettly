<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            $table->string('model', 100)->default('agnes-3-0-flash:free')->after('instruction');
        });
    }

    public function down(): void
    {
        Schema::table('coding_agent_jobs', function (Blueprint $table) {
            $table->dropColumn('model');
        });
    }
};
