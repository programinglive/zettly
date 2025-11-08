<?php

namespace App\Mail;

use App\Models\Todo;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NoteDeleted extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Todo $note)
    {
    }

    public function build(): self
    {
        return $this
            ->subject(__('Note deleted: :title', ['title' => $this->note->title]))
            ->markdown('emails.notes.deleted', [
                'note' => $this->note,
                'user' => $this->note->user,
            ]);
    }
}
