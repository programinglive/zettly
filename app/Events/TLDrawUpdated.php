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

    private const MAX_DOCUMENT_BYTES = 7500;

    public Drawing $drawing;
    public User $user;

    private ?array $documentPayload = null;
    private bool $documentTooLarge = false;
    private ?int $documentBytes = null;
    private ?string $documentFingerprint = null;

    public function documentTooLarge(): bool
    {
        return $this->documentTooLarge;
    }

    public function documentSize(): ?int
    {
        return $this->documentBytes;
    }

    public function documentFingerprint(): ?string
    {
        return $this->documentFingerprint;
    }

    /**
     * Create a new event instance.
     */
    public function __construct(Drawing $drawing, User $user, array $document)
    {
        $this->drawing = $drawing;
        $this->user = $user;
        $this->prepareDocumentPayload($document);
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
            'timestamp' => now()->timestamp,
            'document' => $this->documentPayload,
            'document_too_large' => $this->documentTooLarge,
            'document_size' => $this->documentBytes,
            'document_fingerprint' => $this->documentFingerprint,
            'error' => $this->documentTooLarge ? 'payload_exceeds_limit' : null,
        ];
    }

    private function prepareDocumentPayload(array $document): void
    {
        try {
            $encoded = json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (\Throwable) {
            $encoded = false;
        }

        if ($encoded !== false) {
            $this->documentBytes = strlen($encoded);
            $this->documentFingerprint = md5($encoded);

            if ($this->documentBytes <= self::MAX_DOCUMENT_BYTES) {
                $this->documentPayload = $document;
                return;
            }
        }

        $this->documentPayload = null;
        $this->documentTooLarge = true;
    }
}
