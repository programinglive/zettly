<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Drawing;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('drawings.{drawing}', \App\Broadcasting\DrawingChannel::class);

// TLDraw sync channels
Broadcast::channel('tldraw-{drawingId}', function ($user, $drawingId) {
    // If user is not authenticated, deny access
    if (!$user) {
        return false;
    }
    
    $drawing = Drawing::find($drawingId);
    return $drawing && $drawing->user_id === $user->id;
});

Broadcast::channel('tldraw-{drawingId}-presence', function ($user, $drawingId) {
    // If user is not authenticated, deny access
    if (!$user) {
        return false;
    }
    
    $drawing = Drawing::find($drawingId);
    if (!$drawing || $drawing->user_id !== $user->id) {
        return false;
    }
    
    return [
        'id' => $user->id,
        'name' => $user->name,
        'color' => getUserColor($user->id),
    ];
});

// Helper function to generate consistent user colors
if (!function_exists('getUserColor')) {
    function getUserColor($userId) {
        $colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        ];
        
        return $colors[$userId % count($colors)];
    }
}
