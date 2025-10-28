<?php

namespace App\Events;

use App\Models\Drawing;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DrawingUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public Drawing $drawing)
    {
        //
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('drawings.' . $this->drawing->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->drawing->id,
            'title' => $this->drawing->title,
            'document' => $this->drawing->document,
            'thumbnail' => $this->drawing->thumbnail,
            'updated_at' => $this->drawing->updated_at?->toIso8601String(),
        ];
    }
}
