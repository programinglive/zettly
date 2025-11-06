<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TestEmail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public readonly string $subjectLine,
        public readonly string $body,
        public readonly ?string $senderName = null
    ) {
    }

    /**
     * Build the message.
     */
    public function build(): self
    {
        return $this
            ->subject($this->subjectLine)
            ->view('emails.test')
            ->with([
                'body' => $this->body,
                'senderName' => $this->senderName,
            ]);
    }
}
