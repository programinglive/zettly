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

    private function fingerprint(array $document): string
    {
        return md5(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function encodedSize(array $document): int
    {
        return strlen(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
