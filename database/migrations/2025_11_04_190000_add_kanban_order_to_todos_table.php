<?php

use App\Models\Todo;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('todos', function (Blueprint $table) {
            $table->unsignedInteger('kanban_order')->nullable()->after('importance');
        });

        $counters = [];

        // Backfill existing todos with a deterministic order per user + board column
        Todo::query()
            ->orderBy('user_id')
            ->orderBy('is_completed')
            ->orderBy('priority')
            ->orderBy('importance')
            ->orderBy('created_at')
            ->orderBy('id')
            ->chunk(500, function ($todos) use (&$counters) {
                foreach ($todos as $todo) {
                    if ($todo->type !== Todo::TYPE_TODO || $todo->archived) {
                        continue;
                    }

                    $columnKey = $todo->kanbanColumnKey();
                    $userId = $todo->user_id;

                    if (! isset($counters[$userId])) {
                        $counters[$userId] = [];
                    }

                    if (! isset($counters[$userId][$columnKey])) {
                        $counters[$userId][$columnKey] = 0;
                    }

                    $counters[$userId][$columnKey]++;

                    DB::table('todos')
                        ->where('id', $todo->id)
                        ->update(['kanban_order' => $counters[$userId][$columnKey]]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('todos', function (Blueprint $table) {
            $table->dropColumn('kanban_order');
        });
    }

    private function resolveColumnKey(Todo $todo): string
    {
        if ($todo->is_completed) {
            return 'completed';
        }

        return sprintf(
            'pending:%s:%s',
            $todo->importance ?? Todo::IMPORTANCE_NOT_IMPORTANT,
            $todo->priority ?? Todo::PRIORITY_NOT_URGENT,
        );
    }
};
