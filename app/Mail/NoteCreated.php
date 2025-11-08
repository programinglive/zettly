<?php

namespace App\Mail;

use App\Models\Todo;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NoteCreated extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Todo $note)
    {
    }

    public function build(): self
    {
        return $this
            ->subject(__('New note created: :title', ['title' => $this->note->title]))
            ->markdown('emails.notes.created', [
                'note' => $this->note,
                'user' => $this->note->user,
            ]);
    }
}
