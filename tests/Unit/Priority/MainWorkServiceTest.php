<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\PriorityException;
use App\Models\Focus;
use App\Models\MainWork;
use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MainWorkServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function service(): MainWorkService
    {
        return new MainWorkService($this->user->id);
    }

    public function test_setting_a_focus_main_work_creates_one_row_and_an_audit_entry(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'Clinic platform']);

        $mainWork = $this->service()->set(MainWork::TARGET_FOCUS, $focus->id, 'This pays the bills', 'cli', $this->user->id);

        $this->assertSame(MainWork::TARGET_FOCUS, $mainWork->target_type);
        $this->assertSame($focus->id, $mainWork->target_id);
        $this->assertSame(1, MainWork::count());
        $this->assertSame('Clinic platform', $this->service()->label());

        $audit = PriorityDecision::first();
        $this->assertSame(PriorityDecision::ACTION_SET_MAIN_WORK, $audit->action);
        $this->assertNull($audit->before);
        $this->assertSame($focus->id, $audit->after['target_id']);
    }

    public function test_replacing_main_work_keeps_one_row_and_records_the_previous_value(): void
    {
        $a = Focus::create(['user_id' => $this->user->id, 'title' => 'A']);
        $b = Focus::create(['user_id' => $this->user->id, 'title' => 'B']);

        $this->service()->set(MainWork::TARGET_FOCUS, $a->id, 'First choice', 'cli', $this->user->id);
        $this->service()->set(MainWork::TARGET_FOCUS, $b->id, 'Owner switched focus', 'cli', $this->user->id);

        $this->assertSame(1, MainWork::count());
        $this->assertSame($b->id, $this->service()->get()->target_id);

        $latest = PriorityDecision::latest('id')->first();
        $this->assertSame(PriorityDecision::ACTION_SET_MAIN_WORK, $latest->action);
        $this->assertSame($a->id, $latest->before['target_id']);
        $this->assertSame($b->id, $latest->after['target_id']);
    }

    public function test_a_todo_can_be_the_main_work_and_reports_its_title(): void
    {
        $todo = Todo::create(['user_id' => $this->user->id, 'title' => 'Ship the invoice fix', 'type' => Todo::TYPE_TODO]);

        $this->service()->set(MainWork::TARGET_TODO, $todo->id, 'Only this matters today', 'mcp', $this->user->id);

        $this->assertSame('Ship the invoice fix', $this->service()->label());
    }

    public function test_clearing_main_work_removes_the_row_and_audits_it(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'A']);
        $this->service()->set(MainWork::TARGET_FOCUS, $focus->id, 'Set for now', 'cli', $this->user->id);

        $this->assertTrue($this->service()->clear('Delivered, moving on', 'cli', $this->user->id));

        $this->assertNull($this->service()->get());
        $this->assertSame(0, MainWork::count());
        $this->assertSame(PriorityDecision::ACTION_CLEAR_MAIN_WORK, PriorityDecision::latest('id')->first()->action);
    }

    public function test_a_reason_shorter_than_eight_characters_is_rejected(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'A']);

        $this->expectException(PriorityException::class);

        $this->service()->set(MainWork::TARGET_FOCUS, $focus->id, 'short', 'cli', $this->user->id);
    }

    public function test_a_foreign_focus_cannot_become_main_work(): void
    {
        $other = User::factory()->create();
        $foreign = Focus::create(['user_id' => $other->id, 'title' => 'Theirs']);

        $this->expectException(PriorityException::class);

        $this->service()->set(MainWork::TARGET_FOCUS, $foreign->id, 'Not mine to protect', 'cli', $this->user->id);
    }

    public function test_an_unknown_target_type_is_rejected(): void
    {
        $this->expectException(PriorityException::class);

        $this->service()->set('note', 1, 'Wrong type', 'cli', $this->user->id);
    }

    public function test_a_missing_target_reads_as_no_main_work(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'A']);
        $this->service()->set(MainWork::TARGET_FOCUS, $focus->id, 'Set then deleted', 'cli', $this->user->id);

        $focus->delete();

        $this->assertNull($this->service()->get());
        $this->assertNull($this->service()->label());
    }
}
