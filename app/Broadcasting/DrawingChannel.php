<?php

namespace App\Broadcasting;

use App\Models\Drawing;
use App\Models\User;

class DrawingChannel
{
    /**
     * Create a new channel instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Authenticate the user's access to the channel.
     */
    public function join(?User $user, Drawing $drawing): bool
    {
        // If user is not authenticated, deny access
        if (! $user) {
            return false;
        }

        return $drawing->user_id === $user->id;
    }
}
