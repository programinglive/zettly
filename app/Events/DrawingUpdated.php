<?php

namespace App\Events;

use App\Models\Drawing;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DrawingUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public const MAX_DOCUMENT_BYTES = 7000;

    public Drawing $drawing;

    public bool $documentChanged;

    private ?array $documentPayload = null;

    private bool $documentTooLarge = false;

    private ?int $documentBytes = null;

    private ?string $documentFingerprint = null;

    public function __construct(Drawing $drawing, bool $documentChanged = false)
    {
        $this->drawing = $drawing;
        $this->documentChanged = $documentChanged;

        if ($documentChanged) {
            $this->prepareDocumentPayload($drawing->document);
        }
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('drawings.'.$this->drawing->id),
        ];
    }

    public function broadcastWith(): array
    {
        $payload = [
            'id' => $this->drawing->id,
            'title' => $this->drawing->title,
            'thumbnail' => $this->drawing->thumbnail,
            'updated_at' => $this->drawing->updated_at?->toIso8601String(),
            'document_changed' => $this->documentChanged,
            'document' => $this->documentPayload,
            'document_size' => $this->documentBytes,
            'document_too_large' => $this->documentTooLarge,
            'error' => $this->documentTooLarge ? 'payload_exceeds_limit' : null,
        ];

        if ($this->documentFingerprint !== null) {
            $payload['document_fingerprint'] = $this->documentFingerprint;
        }

        return $payload;
    }

    private function prepareDocumentPayload(mixed $document): void
    {
        if ($document === null) {
            return;
        }

        try {
            $encoded = json_encode($document);

            if ($encoded === false) {
                return;
            }

            $length = strlen($encoded);
            $this->documentBytes = $length;
            $this->documentFingerprint = md5($encoded);

            if ($length <= self::MAX_DOCUMENT_BYTES) {
                $this->documentPayload = $document;

                return;
            }
        } catch (\Throwable) {
            return;
        }

        $this->documentTooLarge = true;
    }
}
