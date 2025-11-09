<?php

namespace App\Mail;

use App\Models\Drawing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DrawingCreated extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Drawing $drawing) {}

    public function build(): self
    {
        return $this
            ->subject(__('New drawing created: :title', ['title' => $this->drawing->title]))
            ->markdown('emails.drawings.created', [
                'drawing' => $this->drawing,
                'user' => $this->drawing->user,
            ]);
    }
}
