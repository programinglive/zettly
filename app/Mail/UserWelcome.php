<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserWelcome extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public User $user) {}

    public function build(): self
    {
        return $this
            ->subject(__('Welcome to Zettly'))
            ->markdown('emails.users.welcome', [
                'user' => $this->user,
            ]);
    }
}
