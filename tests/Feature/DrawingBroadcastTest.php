<?php

namespace Tests\Feature;

use App\Events\DrawingUpdated;
use App\Models\Drawing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DrawingBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Drawing $drawing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->drawing = Drawing::factory()->for($this->user)->create([
            'document' => ['test' => 'data'],
        ]);
    }

    /**
     * Test that DrawingUpdated event doesn't serialize the full Drawing model
     * to avoid exceeding Pusher's 10KB payload limit.
     */
    public function test_drawing_updated_event_excludes_large_document(): void
    {
        Event::fake();

        // Create a large document that would exceed Pusher's limit
        $largeDocument = array_fill(0, 1000, [
            'id' => 'shape-'.uniqid(),
            'type' => 'rectangle',
            'x' => rand(0, 1000),
            'y' => rand(0, 1000),
            'width' => rand(100, 500),
            'height' => rand(100, 500),
            'fill' => '#'.str_pad(dechex(mt_rand(0, 0xFFFFFF)), 6, '0', STR_PAD_LEFT),
        ]);

        $this->drawing->update(['document' => $largeDocument]);

        $event = new DrawingUpdated($this->drawing, true);

        // Verify that the event doesn't contain the full Drawing model
        $this->assertFalse(isset($event->drawing), 'Event should not contain full Drawing model');

        // Verify that the event contains only necessary properties
        $this->assertEquals($this->drawing->id, $event->drawingId);
        $this->assertEquals($this->drawing->title, $event->title);
        $this->assertEquals($this->drawing->thumbnail, $event->thumbnail);
        $this->assertTrue($event->documentChanged);
    }

    /**
     * Test that DrawingUpdated event broadcasts with size information
     */
    public function test_drawing_updated_broadcast_includes_size_info(): void
    {
        $largeDocument = array_fill(0, 500, ['data' => str_repeat('x', 100)]);
        $this->drawing->update(['document' => $largeDocument]);

        $event = new DrawingUpdated($this->drawing, true);
        $broadcast = $event->broadcastWith();

        // Verify size information is included
        $this->assertIsInt($broadcast['document_size']);
        $this->assertGreaterThan(0, $broadcast['document_size']);
        $this->assertIsBool($broadcast['document_too_large']);
    }

    /**
     * Test that small documents are included in the broadcast
     */
    public function test_drawing_updated_includes_small_document(): void
    {
        $smallDocument = ['test' => 'data'];
        $this->drawing->update(['document' => $smallDocument]);

        $event = new DrawingUpdated($this->drawing, true);
        $broadcast = $event->broadcastWith();

        // Verify small document is included
        $this->assertFalse($broadcast['document_too_large']);
        $this->assertNull($broadcast['error']);
        $this->assertEquals($smallDocument, $broadcast['document']);
    }

    /**
     * Test that large documents are excluded from broadcast
     */
    public function test_drawing_updated_excludes_large_document(): void
    {
        // Create a document larger than MAX_DOCUMENT_BYTES (7000)
        $largeDocument = array_fill(0, 1000, [
            'id' => 'shape-'.uniqid(),
            'data' => str_repeat('x', 100),
        ]);

        $this->drawing->update(['document' => $largeDocument]);

        $event = new DrawingUpdated($this->drawing, true);
        $broadcast = $event->broadcastWith();

        // Verify large document is excluded
        $this->assertTrue($broadcast['document_too_large']);
        $this->assertEquals('payload_exceeds_limit', $broadcast['error']);
        $this->assertNull($broadcast['document']);
    }

    /**
     * Test that broadcast channel is correct
     */
    public function test_drawing_updated_broadcast_channel(): void
    {
        $event = new DrawingUpdated($this->drawing, false);
        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertEquals('private-drawings.'.$this->drawing->id, $channels[0]->name);
    }

    /**
     * Test that document fingerprint is included when available
     */
    public function test_drawing_updated_includes_document_fingerprint(): void
    {
        $document = ['test' => 'data'];
        $this->drawing->update(['document' => $document]);

        $event = new DrawingUpdated($this->drawing, true);
        $broadcast = $event->broadcastWith();

        // Verify fingerprint is included
        $this->assertArrayHasKey('document_fingerprint', $broadcast);
        $this->assertIsString($broadcast['document_fingerprint']);
        $this->assertEquals(32, strlen($broadcast['document_fingerprint'])); // MD5 hash length
    }
}
