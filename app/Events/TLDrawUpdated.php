<?php

namespace App\Events;

use App\Models\Drawing;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TLDrawUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Drawing $drawing;
    public User $user;
    public array $document;

    /**
     * Create a new event instance.
     */
    public function __construct(Drawing $drawing, User $user, array $document)
    {
        $this->drawing = $drawing;
        $this->user = $user;
        $this->document = $document;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tldraw-' . $this->drawing->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'TLDrawUpdate';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'drawingId' => $this->drawing->id,
            'userId' => $this->user->id,
            'userName' => $this->user->name,
            'document' => $this->document,
            'timestamp' => now()->timestamp,
        ];
    }
}
