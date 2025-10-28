<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('drawings', function (Blueprint $table) {
            $table->longText('thumbnail')->nullable()->after('document');
        });
    }

    public function down(): void
    {
        Schema::table('drawings', function (Blueprint $table) {
            $table->dropColumn('thumbnail');
        });
    }
};
