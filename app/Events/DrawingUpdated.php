<?php

namespace App\Events;

use App\Models\Drawing;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class DrawingUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public const MAX_DOCUMENT_BYTES = 7000;

    public const MAX_EVENT_BYTES = 9500;

    public int $drawingId = 0;

    public string $title = '';

    public ?string $thumbnail = null;

    public string $updatedAt = '';

    public bool $documentChanged = false;

    private ?array $documentPayload = null;

    private bool $documentTooLarge = false;

    private ?int $documentBytes = null;

    private ?string $documentFingerprint = null;

    public function __construct(Drawing $drawing, bool $documentChanged = false)
    {
        $this->drawingId = $drawing->id;
        $this->title = $drawing->title;
        $this->thumbnail = $drawing->thumbnail;
        $this->updatedAt = $drawing->updated_at?->toIso8601String() ?? now()->toIso8601String();
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
            new PrivateChannel('drawings.'.$this->drawingId),
        ];
    }

    public function broadcastWith(): array
    {
        $payload = [
            'id' => $this->drawingId,
            'title' => $this->title,
            'thumbnail' => $this->thumbnail,
            'updated_at' => $this->updatedAt,
            'document_changed' => $this->documentChanged,
            'document' => $this->documentPayload,
            'document_size' => $this->documentBytes,
            'document_too_large' => $this->documentTooLarge,
            'error' => $this->documentTooLarge ? 'payload_exceeds_limit' : null,
        ];

        if ($this->documentFingerprint !== null) {
            $payload['document_fingerprint'] = $this->documentFingerprint;
        }

        $payload = $this->reduceMetadataIfNeeded($payload);

        if ($this->documentPayload !== null && $this->payloadTooLarge($payload)) {
            $this->documentPayload = null;
            $this->documentTooLarge = true;
            $payload['document'] = null;
            $payload['document_too_large'] = true;
            $payload['error'] = 'payload_exceeds_limit';
        }

        $payload = $this->reduceMetadataIfNeeded($payload);

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

    private function payloadTooLarge(array $payload): bool
    {
        try {
            $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (\Throwable) {
            return false;
        }

        return $encoded !== false && strlen($encoded) > self::MAX_EVENT_BYTES;
    }

    private function reduceMetadataIfNeeded(array $payload): array
    {
        if (! $this->payloadTooLarge($payload)) {
            return $payload;
        }

        $payload['metadata_reduced'] = true;

        if (isset($payload['title'])) {
            $payload['title'] = Str::limit($payload['title'], 255, '');
        }

        if ($this->payloadTooLarge($payload) && isset($payload['thumbnail'])) {
            $payload['thumbnail'] = null;
        }

        if ($this->payloadTooLarge($payload) && isset($payload['title'])) {
            $payload['title'] = Str::limit($payload['title'], 120, '');
        }

        if ($this->payloadTooLarge($payload) && isset($payload['title'])) {
            unset($payload['title']);
        }

        if ($this->payloadTooLarge($payload)) {
            unset($payload['document_fingerprint'], $payload['document_size']);
        }

        return $payload;
    }
}
