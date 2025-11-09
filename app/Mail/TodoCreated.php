<?php

namespace App\Mail;

use App\Models\Todo;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TodoCreated extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Todo $todo) {}

    /**
     * Build the message.
     */
    public function build(): self
    {
        return $this
            ->subject(__('New todo created: :title', ['title' => $this->todo->title]))
            ->markdown('emails.todos.created', [
                'todo' => $this->todo,
                'user' => $this->todo->user,
            ]);
    }
}
