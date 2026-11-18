<?php

namespace App\Console\Commands;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\DependencyGraph;
use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\P0Service;
use App\Domain\Priority\PriorityException;
use App\Domain\Priority\PriorityExplainer;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Todo;
use App\Models\TodoDependency;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class PriorityCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zettly:priority
                            {action=queue : Action to perform (queue, explain, commit, uncommit, main-work, p0, deps)}
                            {--user=1 : The user ID to evaluate}
                            {--date= : The date in YYYY-MM-DD format (defaults to today)}
                            {--todo= : Target Todo ID}
                            {--explain= : Todo ID to explain directly}
                            {--limit= : Limit the number of queue proposals}
                            {--reason= : Reason for state changes / commit / p0}
                            {--target-type= : Main work target type (focus, todo)}
                            {--target-id= : Main work target ID}
                            {--expires-at= : P0 expiration datetime (ISO 8601 or Y-m-d H:i:s)}
                            {--depends-on= : Blocker Todo ID for dependency}
                            {--remove : Remove dependency edge}
                            {--clear : Clear main work or P0 declaration}
                            {--allow-over-capacity : Allow committing over daily capacity or WIP limit}
                            {--json : Output raw JSON}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Evaluate, inspect, and manage the Zettly Priority Engine queue and decisions';

    private const SOURCE = 'cli';

    public function handle(): int
    {
        $userId = (int) ($this->option('user') ?: 1);
        $dateStr = $this->option('date');
        $today = $dateStr
            ? CarbonImmutable::parse($dateStr)->startOfDay()
            : CarbonImmutable::now()->startOfDay();

        $settings = (new PrioritySettingsService($userId))->get();

        if ($explainId = $this->option('explain')) {
            return $this->handleExplain($userId, (int) $explainId, $settings, $today);
        }

        $action = strtolower($this->argument('action'));

        try {
            return match ($action) {
                'queue' => $this->handleQueue($userId, $settings, $today),
                'explain' => $this->handleExplain($userId, (int) $this->option('todo'), $settings, $today),
                'commit' => $this->handleCommit($userId, $settings, $today),
                'uncommit' => $this->handleUncommit($userId, $settings, $today),
                'main-work' => $this->handleMainWork($userId),
                'p0' => $this->handleP0($userId, $settings, $today),
                'deps', 'dependencies' => $this->handleDependencies($userId),
                default => $this->invalidAction($action),
            };
        } catch (PriorityException $e) {
            if ($this->option('json')) {
                $this->line(json_encode([
                    'success' => false,
                    'error' => [
                        'code' => $e->errorCode,
                        'message' => $e->getMessage(),
                        'details' => $e->details,
                    ],
                ], JSON_PRETTY_PRINT));
            } else {
                $this->error("Priority Error [{$e->errorCode}]: {$e->getMessage()}");
            }

            return 1;
        }
    }

    private function handleQueue(int $userId, $settings, CarbonImmutable $today): int
    {
        $builder = new PriorityQueueBuilder($userId, $settings, $today);
        $limit = $this->option('limit') !== null ? (int) $this->option('limit') : null;
        $payload = $builder->build($limit);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'data' => $payload], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("=== Zettly Priority Queue ({$today->toDateString()}) ===");

        $todayItems = $payload['today'] ?? [];
        $nextItems = $payload['next'] ?? [];
        $warnings = $payload['warnings'] ?? [];

        $this->line('');
        $this->info('Today (Committed):');
        if (empty($todayItems)) {
            $this->comment('  (No tasks committed for today)');
        } else {
            foreach ($todayItems as $i => $item) {
                $pos = $i + 1;
                $reasons = is_array($item['reasons'] ?? null) ? implode('; ', array_filter($item['reasons'])) : '';
                $keyStr = is_array($item['key'] ?? null) ? json_encode($item['key']) : ($item['key'] ?? '-');
                $this->line("  {$pos}. [#{$item['id']}] {$item['title']} ({$keyStr}) {$reasons}");
            }
        }

        $this->line('');
        $this->info('Next (Recommended):');
        if (empty($nextItems)) {
            $this->comment('  (No recommendations available)');
        } else {
            foreach ($nextItems as $i => $item) {
                $pos = $i + 1;
                $reasons = is_array($item['reasons'] ?? null) ? implode('; ', array_filter($item['reasons'])) : '';
                $keyStr = is_array($item['key'] ?? null) ? json_encode($item['key']) : ($item['key'] ?? '-');
                $this->line("  {$pos}. [#{$item['id']}] {$item['title']} ({$keyStr}) {$reasons}");
            }
        }

        if (! empty($warnings)) {
            $this->line('');
            $this->warn('Warnings:');
            foreach ($warnings as $w) {
                $this->line("  - [{$w['type']}] {$w['message']}");
            }
        }

        $this->line('');
        $triageCount = $payload['triage']['total'] ?? $payload['triage_count'] ?? 0;
        $this->comment("Triage backlog count: {$triageCount}");

        return 0;
    }

    private function handleExplain(int $userId, int $todoId, $settings, CarbonImmutable $today): int
    {
        if ($todoId <= 0) {
            $this->error('Please specify a valid --todo ID to explain.');

            return 1;
        }

        $todo = Todo::where('user_id', $userId)->find($todoId);
        if (! $todo) {
            throw PriorityException::foreignTodo($todoId);
        }

        $explainer = new PriorityExplainer($userId, $settings, $today);
        $explanation = $explainer->explain($todo);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'data' => $explanation], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("=== Priority Explanation for Todo #{$todo->id}: {$todo->title} ===");
        $this->line("Ready: " . ($explanation['ready'] ? 'YES' : 'NO'));
        if (! empty($explanation['readiness_reasons'])) {
            $this->line("Readiness reasons: " . implode(', ', $explanation['readiness_reasons']));
        }
        $this->line("Position in queue: " . ($explanation['position'] ?? 'None'));
        $this->line("Decided by: {$explanation['decided_by']}");
        $this->line("Detail: {$explanation['detail']}");

        if (! empty($explanation['blocked_by'])) {
            $this->warn("Blocked by: " . implode(', ', array_map(fn ($b) => "#{$b['id']} ({$b['title']})", $explanation['blocked_by'])));
        }

        if (! empty($explanation['blocks'])) {
            $this->info("Unblocks: " . implode(', ', array_map(fn ($b) => "#{$b['id']} ({$b['title']})", $explanation['blocks'])));
        }

        return 0;
    }

    private function handleCommit(int $userId, $settings, CarbonImmutable $today): int
    {
        $todoId = (int) $this->option('todo');
        if ($todoId <= 0) {
            $this->error('Please specify --todo=<id> to commit.');

            return 1;
        }

        $reason = (string) $this->option('reason');
        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired('Commit');
        }

        $todo = Todo::where('user_id', $userId)->find($todoId);
        if (! $todo) {
            throw PriorityException::foreignTodo($todoId);
        }

        $planner = new DayPlanner($userId, $settings, $today);
        $item = $planner->commit($todo, $reason, (bool) $this->option('allow-over-capacity'), self::SOURCE);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'data' => $item], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("Committed Todo #{$todo->id} to today's plan ({$today->toDateString()}).");

        return 0;
    }

    private function handleUncommit(int $userId, $settings, CarbonImmutable $today): int
    {
        $todoId = (int) $this->option('todo');
        if ($todoId <= 0) {
            $this->error('Please specify --todo=<id> to uncommit.');

            return 1;
        }

        $reason = (string) $this->option('reason');
        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired('Uncommit');
        }

        $todo = Todo::where('user_id', $userId)->find($todoId);
        if (! $todo) {
            throw PriorityException::foreignTodo($todoId);
        }

        $planner = new DayPlanner($userId, $settings, $today);
        $planner->uncommit($todo, $reason, self::SOURCE);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'uncommitted' => $todoId], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("Uncommitted Todo #{$todo->id} from today's plan.");

        return 0;
    }

    private function handleMainWork(int $userId): int
    {
        $service = new MainWorkService($userId);

        if ($this->option('clear')) {
            $reason = (string) $this->option('reason');
            if (mb_strlen(trim($reason)) < 8) {
                throw PriorityException::reasonRequired('Clear main work');
            }
            $service->clear($reason, self::SOURCE, $userId);

            if ($this->option('json')) {
                $this->line(json_encode(['success' => true, 'cleared' => true], JSON_PRETTY_PRINT));

                return 0;
            }

            $this->info('Main work cleared successfully.');

            return 0;
        }

        $targetType = $this->option('target-type');
        $targetId = (int) $this->option('target-id');
        $reason = (string) $this->option('reason');

        if (! $targetType || ! $targetId) {
            $current = $service->get();
            if ($this->option('json')) {
                $this->line(json_encode(['success' => true, 'data' => $current], JSON_PRETTY_PRINT));

                return 0;
            }

            if (! $current) {
                $this->comment('No active Main Work set.');
            } else {
                $this->info("Active Main Work: {$current->target_type} #{$current->target_id} ({$service->label()})");
                $this->line("Reason: {$current->reason}");
            }

            return 0;
        }

        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired('Set main work');
        }

        $row = $service->set($targetType, $targetId, $reason, self::SOURCE, $userId);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'data' => $row], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("Main work set to {$targetType} #{$targetId}.");

        return 0;
    }

    private function handleP0(int $userId, $settings, CarbonImmutable $today): int
    {
        $todoId = (int) $this->option('todo');
        if ($todoId <= 0) {
            $this->error('Please specify --todo=<id> for P0 management.');

            return 1;
        }

        $todo = Todo::where('user_id', $userId)->find($todoId);
        if (! $todo) {
            throw PriorityException::foreignTodo($todoId);
        }

        $service = new P0Service($userId, $settings);

        if ($this->option('clear')) {
            $reason = (string) $this->option('reason');
            if (mb_strlen(trim($reason)) < 8) {
                throw PriorityException::reasonRequired('Clear P0');
            }
            $service->clear($todo, $reason, self::SOURCE, $userId);

            if ($this->option('json')) {
                $this->line(json_encode(['success' => true, 'cleared' => true], JSON_PRETTY_PRINT));

                return 0;
            }

            $this->info("Cleared P0 declaration on Todo #{$todo->id}.");

            return 0;
        }

        $reason = (string) $this->option('reason');
        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired('Declare P0');
        }

        $expiresAtStr = $this->option('expires-at');
        $expiresAt = $expiresAtStr ? CarbonImmutable::parse($expiresAtStr) : $today->addHours(24);

        $todo = $service->declare($todo, $reason, $expiresAt, self::SOURCE, $userId);

        if ($this->option('json')) {
            $this->line(json_encode(['success' => true, 'data' => $todo], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("Declared P0 on Todo #{$todo->id} (expires: {$todo->p0_expires_at->toDateTimeString()}).");

        return 0;
    }

    private function handleDependencies(int $userId): int
    {
        $todoId = (int) $this->option('todo');
        if ($todoId <= 0) {
            $this->error('Please specify --todo=<id> for dependencies.');

            return 1;
        }

        $todo = Todo::where('user_id', $userId)->find($todoId);
        if (! $todo) {
            throw PriorityException::foreignTodo($todoId);
        }

        $graph = new DependencyGraph($userId);
        $dependsOnId = (int) $this->option('depends-on');

        if ($this->option('remove')) {
            if ($dependsOnId <= 0) {
                $this->error('Please specify --depends-on=<id> to remove.');

                return 1;
            }

            $graph->remove($todo, $dependsOnId);

            if ($this->option('json')) {
                $this->line(json_encode(['success' => true, 'removed' => true], JSON_PRETTY_PRINT));

                return 0;
            }

            $this->info("Removed dependency: Todo #{$todo->id} no longer depends on #{$dependsOnId}.");

            return 0;
        }

        if ($dependsOnId > 0) {
            $dependsOn = Todo::where('user_id', $userId)->find($dependsOnId);
            if (! $dependsOn) {
                throw PriorityException::foreignTodo($dependsOnId);
            }

            $edge = $graph->add($todo, $dependsOn, self::SOURCE);

            if ($this->option('json')) {
                $this->line(json_encode(['success' => true, 'data' => $edge], JSON_PRETTY_PRINT));

                return 0;
            }

            $this->info("Added dependency: Todo #{$todo->id} now depends on #{$dependsOn->id}.");

            return 0;
        }

        // List dependencies
        $blockers = collect($graph->dependenciesOf($todo));
        $dependents = TodoDependency::query()
            ->where('user_id', $userId)
            ->where('depends_on_todo_id', $todo->id)
            ->pluck('todo_id')
            ->all();

        if ($this->option('json')) {
            $this->line(json_encode([
                'success' => true,
                'data' => [
                    'todo_id' => $todo->id,
                    'blocked_by' => $blockers->pluck('id')->all(),
                    'unblocks' => $dependents,
                ],
            ], JSON_PRETTY_PRINT));

            return 0;
        }

        $this->info("=== Dependencies for Todo #{$todo->id} ===");
        $this->line("Blocked by: " . ($blockers->isEmpty() ? 'None' : implode(', ', $blockers->pluck('id')->all())));
        $this->line("Unblocks: " . (empty($dependents) ? 'None' : implode(', ', $dependents)));

        return 0;
    }

    private function formatQueueRows(array $items): array
    {
        return array_map(function ($item) {
            $reasons = $item['reasons'] ?? '-';
            if (is_array($reasons)) {
                $reasons = implode('; ', array_map(fn ($r) => is_string($r) ? $r : json_encode($r), $reasons));
            }

            return [
                'ID' => $item['id'] ?? '',
                'Title' => $item['title'] ?? '',
                'Reason' => $reasons ?: '-',
                'Key' => $item['key'] ?? '-',
            ];
        }, $items);
    }

    private function invalidAction(string $action): int
    {
        $this->error("Unknown action: {$action}. Available actions: queue, explain, commit, uncommit, main-work, p0, deps.");

        return 1;
    }
}
