<?php

namespace App\Mail;

use App\Models\Drawing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DrawingUpdated extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Drawing $drawing) {}

    public function build(): self
    {
        return $this
            ->subject(__('Drawing updated: :title', ['title' => $this->drawing->title]))
            ->markdown('emails.drawings.updated', [
                'drawing' => $this->drawing,
                'user' => $this->drawing->user,
            ]);
    }
}
