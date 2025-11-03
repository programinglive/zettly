# Pusher Payload Size Limit Fix

## Problem

The `DrawingUpdated` event was broadcasting the entire `Drawing` model via the `SerializesModels` trait, which included the full `document` field. This caused Pusher errors when documents exceeded 10KB:

```
Illuminate\Broadcasting\BroadcastException: Pusher error: The data content of this event exceeds the allowed maximum (10240 bytes).
```

This issue occurred 35+ times in production, affecting drawing synchronization.

## Root Cause

While the event had logic to check document size and exclude oversized documents from `$documentPayload`, the `SerializesModels` trait still serialized the entire `Drawing` model, including the full `document` field. This resulted in payloads exceeding Pusher's 10KB limit.

## Solution

Refactored `DrawingUpdated` event to:

1. **Extract only necessary fields** from the Drawing model in the constructor:
   - `drawingId` (int)
   - `title` (string)
   - `thumbnail` (nullable string)
   - `updatedAt` (string - ISO8601)
   - `documentChanged` (bool)

2. **Exclude the full Drawing model** from serialization, preventing the large document from being included in the broadcast payload.

3. **Maintain size checking** for the document payload with `MAX_DOCUMENT_BYTES = 7000`.

## Changes Made

### File: `app/Events/DrawingUpdated.php`

**Before:**
```php
public Drawing $drawing;  // Entire model serialized, including large document

public function __construct(Drawing $drawing, bool $documentChanged = false)
{
    $this->drawing = $drawing;
    // ...
}

public function broadcastOn(): array
{
    return [
        new PrivateChannel('drawings.'.$this->drawing->id),
    ];
}
```

**After:**
```php
public int $drawingId;
public string $title;
public ?string $thumbnail;
public string $updatedAt;
public bool $documentChanged;

public function __construct(Drawing $drawing, bool $documentChanged = false)
{
    $this->drawingId = $drawing->id;
    $this->title = $drawing->title;
    $this->thumbnail = $drawing->thumbnail;
    $this->updatedAt = $drawing->updated_at?->toIso8601String() ?? now()->toIso8601String();
    $this->documentChanged = $documentChanged;
    // ...
}

public function broadcastOn(): array
{
    return [
        new PrivateChannel('drawings.'.$this->drawingId),
    ];
}
```

## Impact

- **Reduced payload size**: Eliminates unnecessary model serialization
- **Prevents Pusher errors**: Documents up to 7KB can be safely broadcast
- **Maintains functionality**: All necessary information is still included in the broadcast
- **Improves performance**: Smaller payloads = faster transmission

## Testing

Comprehensive test suite added in `tests/Feature/DrawingBroadcastTest.php`:

- ✅ Event excludes large Drawing model
- ✅ Broadcast includes size information
- ✅ Small documents are included
- ✅ Large documents are excluded with error flag
- ✅ Correct broadcast channel
- ✅ Document fingerprint included

## Related Issues

- **TODOAPP-26**: Pusher error - payload exceeds 10KB limit (RESOLVED)

## Monitoring

Monitor Sentry for:
- `Illuminate\Broadcasting\BroadcastException` with "exceeds the allowed maximum"
- Should see zero occurrences after this fix

## Pusher Limits Reference

- **Maximum payload size**: 10,240 bytes (10KB)
- **Safe document size**: 7,000 bytes (leaves room for event metadata)
- **Recommended approach**: Exclude large documents, send fingerprint instead

For more info: https://pusher.com/docs/channels/server_api/http-api#publishing-events
