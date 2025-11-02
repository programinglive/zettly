<?php

namespace App\Events;

use App\Models\Drawing;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserLeftDrawing implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Drawing $drawing;

    public User $user;

    /**
     * Create a new event instance.
     */
    public function __construct(Drawing $drawing, User $user)
    {
        $this->drawing = $drawing;
        $this->user = $user;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tldraw-'.$this->drawing->id),
            new PresenceChannel('tldraw-'.$this->drawing->id.'-presence'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'UserLeft';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'drawingId' => $this->drawing->id,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'color' => $this->getUserColor($this->user->id),
            ],
            'timestamp' => now()->timestamp,
        ];
    }

    /**
     * Generate a consistent color for each user
     */
    private function getUserColor($userId): string
    {
        $colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        ];

        return $colors[$userId % count($colors)];
    }
}
