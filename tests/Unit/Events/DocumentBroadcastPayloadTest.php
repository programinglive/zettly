<?php

namespace Tests\Unit\Events;

use App\Events\DrawingUpdated;
use App\Events\TLDrawUpdated;
use App\Models\Drawing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DocumentBroadcastPayloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_drawing_updated_includes_document_when_small(): void
    {
        Carbon::setTestNow('2025-10-30 00:00:00');

        $user = User::factory()->create();
        $drawing = Drawing::factory()->for($user)->create([
            'document' => ['content' => 'small'],
            'thumbnail' => 'thumb.png',
        ]);

        $event = new DrawingUpdated($drawing->fresh(), true);
        $payload = $event->broadcastWith();

        $this->assertSame(['content' => 'small'], $payload['document']);
        $this->assertFalse($payload['document_too_large']);
        $this->assertSame('thumb.png', $payload['thumbnail']);
        $this->assertSame('2025-10-30T00:00:00+00:00', $payload['updated_at']);
        $this->assertSame($this->fingerprint(['content' => 'small']), $payload['document_fingerprint']);
        $this->assertSame($this->encodedSize(['content' => 'small']), $payload['document_size']);
    }

    public function test_drawing_updated_flags_large_document(): void
    {
        $user = User::factory()->create();
        $document = ['content' => str_repeat('A', 9500)];
        $drawing = Drawing::factory()->for($user)->create([
            'document' => $document,
        ]);

        $event = new DrawingUpdated($drawing->fresh(), true);
        $payload = $event->broadcastWith();

        $this->assertNull($payload['document']);
        $this->assertTrue($payload['document_too_large']);
        $this->assertGreaterThan(9000, $payload['document_size']);
        $this->assertSame($this->fingerprint($document), $payload['document_fingerprint']);
        $this->assertSame('payload_exceeds_limit', $payload['error']);
    }

    public function test_drawing_updated_flags_document_when_total_payload_exceeds_limit(): void
    {
        $user = User::factory()->create();
        $document = ['content' => str_repeat('B', 6900)];
        $drawing = Drawing::factory()->for($user)->create([
            'document' => $document,
            'title' => str_repeat('Wide Title ', 600),
        ]);

        $event = new DrawingUpdated($drawing->fresh(), true);
        $payload = $event->broadcastWith();

        $this->assertTrue($payload['metadata_reduced'] ?? false);
        $this->assertNull($payload['thumbnail']);
        $this->assertSame($document, $payload['document']);
        $this->assertFalse($payload['document_too_large']);
        $this->assertNull($payload['error']);
        $this->assertSame($this->fingerprint($document), $payload['document_fingerprint']);
        $this->assertSame($this->encodedSize($document), $payload['document_size']);
        $this->assertLessThanOrEqual(DrawingUpdated::MAX_EVENT_BYTES, $this->encodedSize($payload));
    }

    public function test_tldraw_update_includes_document_when_small(): void
    {
        $drawing = Drawing::factory()->create();
        $user = User::factory()->create();
        $document = ['shapes' => ['shape:1' => ['id' => 'shape:1']]];

        $event = new TLDrawUpdated($drawing, $user, $document);
        $payload = $event->broadcastWith();

        $this->assertSame($document, $payload['document']);
        $this->assertFalse($payload['document_too_large']);
        $this->assertSame($this->fingerprint($document), $payload['document_fingerprint']);
        $this->assertSame($this->encodedSize($document), $payload['document_size']);
        $this->assertNull($payload['error']);
    }

    public function test_tldraw_update_flags_large_document(): void
    {
        $drawing = Drawing::factory()->create();
        $user = User::factory()->create();
        $document = ['content' => str_repeat('B', 9500)];

        $event = new TLDrawUpdated($drawing, $user, $document);
        $payload = $event->broadcastWith();

        $this->assertNull($payload['document']);
        $this->assertTrue($payload['document_too_large']);
        $this->assertGreaterThan(9000, $payload['document_size']);
        $this->assertSame($this->fingerprint($document), $payload['document_fingerprint']);
    }

    public function test_tldraw_update_flags_document_when_total_payload_exceeds_limit(): void
    {
        Carbon::setTestNow('2025-11-08 00:00:00');

        $drawing = Drawing::factory()->create();
        $user = User::factory()->create(['name' => str_repeat('Collaborator ', 600)]);
        $document = ['content' => str_repeat('C', 7400)];

        $documentBytes = $this->encodedSize($document);
        $this->assertLessThanOrEqual(7500, $documentBytes, 'Document should be below the direct document threshold.');

        $wouldOverflowPayload = [
            'drawingId' => $drawing->id,
            'userId' => $user->id,
            'userName' => $user->name,
            'timestamp' => now()->timestamp,
            'document' => $document,
            'document_too_large' => false,
            'document_size' => $documentBytes,
            'document_fingerprint' => $this->fingerprint($document),
            'error' => null,
        ];

        $this->assertGreaterThan(9500, $this->encodedSize($wouldOverflowPayload));

        $event = new TLDrawUpdated($drawing, $user, $document);
        $payload = $event->broadcastWith();

        $this->assertNull($payload['document']);
        $this->assertTrue($payload['document_too_large']);
        $this->assertSame('payload_exceeds_limit', $payload['error']);
        $this->assertSame($documentBytes, $payload['document_size']);
        $this->assertSame($this->fingerprint($document), $payload['document_fingerprint']);

        Carbon::setTestNow();
    }

    private function fingerprint(array $document): string
    {
        return md5(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function encodedSize(array $document): int
    {
        return strlen(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
