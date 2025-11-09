<?php

namespace App\Mail;

use App\Models\Todo;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TodoUpdated extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Todo $todo) {}

    public function build(): self
    {
        return $this
            ->subject(__('Todo updated: :title', ['title' => $this->todo->title]))
            ->markdown('emails.todos.updated', [
                'todo' => $this->todo,
                'user' => $this->todo->user,
            ]);
    }
}
