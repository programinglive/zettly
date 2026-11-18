<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\DependencyGraph;
use App\Domain\Priority\PriorityException;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DependencyGraphTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function todo(string $title, bool $completed = false, bool $archived = false): Todo
    {
        $todo = Todo::create([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
        ]);

        if ($completed) {
            $todo->forceFill(['is_completed' => true, 'completed_at' => now()])->save();
        }

        if ($archived) {
            $todo->forceFill(['archived' => true])->save();
        }

        return $todo;
    }

    public function test_a_task_waiting_on_an_open_task_is_blocked(): void
    {
        $blocker = $this->todo('Migration');
        $waiting = $this->todo('Deploy');

        $graph = new DependencyGraph($this->user->id);
        $graph->add($waiting, $blocker, 'cli');

        $this->assertSame([$blocker->id], $graph->blockedIds()[$waiting->id] ?? []);
    }

    public function test_a_completed_or_archived_blocker_no_longer_blocks(): void
    {
        $done = $this->todo('Done', completed: true);
        $parked = $this->todo('Parked', archived: true);
        $waiting = $this->todo('Waiting');

        $graph = new DependencyGraph($this->user->id);
        $graph->add($waiting, $done, 'cli');
        $graph->add($waiting, $parked, 'cli');

        $this->assertArrayNotHasKey($waiting->id, $graph->blockedIds());
    }

    public function test_unblock_count_counts_open_dependents(): void
    {
        $base = $this->todo('Base');
        $this->todo('One');
        $two = $this->todo('Two');

        $graph = new DependencyGraph($this->user->id);
        $graph->add($this->todo('One'), $base, 'cli');
        $graph->add($two, $base, 'cli');

        $this->assertSame(2, $graph->unblockCounts()[$base->id] ?? 0);
    }

    public function test_a_direct_cycle_is_rejected(): void
    {
        $a = $this->todo('A');
        $b = $this->todo('B');

        $graph = new DependencyGraph($this->user->id);
        $graph->add($a, $b, 'cli');

        $this->expectException(PriorityException::class);

        $graph->add($b, $a, 'cli');
    }

    public function test_a_longer_cycle_is_rejected(): void
    {
        $a = $this->todo('A');
        $b = $this->todo('B');
        $c = $this->todo('C');

        $graph = new DependencyGraph($this->user->id);
        $graph->add($a, $b, 'cli');
        $graph->add($b, $c, 'cli');

        $this->expectException(PriorityException::class);

        $graph->add($c, $a, 'cli');
    }

    public function test_a_task_cannot_wait_on_itself(): void
    {
        $a = $this->todo('A');

        $this->expectException(PriorityException::class);

        (new DependencyGraph($this->user->id))->add($a, $a, 'cli');
    }

    public function test_a_foreign_task_cannot_be_linked(): void
    {
        $other = User::factory()->create();
        $foreign = Todo::create([
            'user_id' => $other->id,
            'title' => 'Theirs',
            'type' => Todo::TYPE_TODO,
        ]);
        $mine = $this->todo('Mine');

        $this->expectException(PriorityException::class);

        (new DependencyGraph($this->user->id))->add($mine, $foreign, 'cli');
    }
}
