<?php

namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use App\Models\Drawing;

class TLDrawSyncHandler implements MessageComponentInterface
{
    protected \SplObjectStorage $clients;
    protected array $rooms = [];

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        Log::info('TLDraw Sync: New connection', ['connId' => $conn->resourceId]);
    }

    public function onMessage(ConnectionInterface $conn, $msg)
    {
        try {
            $data = json_decode($msg, true);
            
            if (!$data || !isset($data['type'])) {
                $conn->send(json_encode(['type' => 'error', 'message' => 'Invalid message format']));
                return;
            }

            switch ($data['type']) {
                case 'authenticate':
                    $this->handleAuthenticate($conn, $data);
                    break;
                    
                case 'join-room':
                    $this->handleJoinRoom($conn, $data);
                    break;
                    
                case 'leave-room':
                    $this->handleLeaveRoom($conn, $data);
                    break;
                    
                case 'sync-update':
                    $this->handleSyncUpdate($conn, $data);
                    break;
                    
                case 'presence-update':
                    $this->handlePresenceUpdate($conn, $data);
                    break;
                    
                default:
                    $conn->send(json_encode(['type' => 'error', 'message' => 'Unknown message type']));
            }
        } catch (\Exception $e) {
            Log::error('TLDraw Sync: Error handling message', ['error' => $e->getMessage()]);
            $conn->send(json_encode(['type' => 'error', 'message' => 'Server error']));
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        
        // Remove from all rooms
        foreach ($this->rooms as $roomId => $room) {
            if (isset($room['connections'][$conn->resourceId])) {
                $user = $room['connections'][$conn->resourceId];
                unset($room['connections'][$conn->resourceId]);
                
                // Notify others that user left
                $this->broadcastToRoom($roomId, [
                    'type' => 'user-left',
                    'user' => $user,
                ], $conn);
                
                // Clean up empty rooms
                if (empty($room['connections'])) {
                    unset($this->rooms[$roomId]);
                }
            }
        }
        
        Log::info('TLDraw Sync: Connection closed', ['connId' => $conn->resourceId]);
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        Log::error('TLDraw Sync: Connection error', ['error' => $e->getMessage()]);
        $conn->close();
    }

    protected function handleAuthenticate(ConnectionInterface $conn, array $data)
    {
        // Verify token (simplified - in production, use proper JWT)
        if (!isset($data['token'])) {
            $conn->send(json_encode(['type' => 'auth-error', 'message' => 'Token required']));
            return;
        }

        // For now, we'll trust the token and extract user info
        // In production, verify the HMAC signature
        $tokenData = json_decode(base64_decode($data['token']), true);
        
        if (!$tokenData || !isset($tokenData['userId'])) {
            $conn->send(json_encode(['type' => 'auth-error', 'message' => 'Invalid token']));
            return;
        }

        $conn->userId = $tokenData['userId'];
        $conn->userName = $tokenData['userName'] ?? 'User';
        $conn->userColor = $tokenData['userColor'] ?? '#FF6B6B';
        
        $conn->send(json_encode([
            'type' => 'authenticated',
            'user' => [
                'id' => $conn->userId,
                'name' => $conn->userName,
                'color' => $conn->userColor,
            ],
        ]));
    }

    protected function handleJoinRoom(ConnectionInterface $conn, array $data)
    {
        if (!isset($conn->userId)) {
            $conn->send(json_encode(['type' => 'error', 'message' => 'Not authenticated']));
            return;
        }

        $roomId = $data['roomId'] ?? null;
        if (!$roomId) {
            $conn->send(json_encode(['type' => 'error', 'message' => 'Room ID required']));
            return;
        }

        // Verify user has access to this drawing
        if (preg_match('/^drawing-(\d+)$/', $roomId, $matches)) {
            $drawingId = $matches[1];
            $drawing = Drawing::find($drawingId);
            
            if (!$drawing || $drawing->user_id !== $conn->userId) {
                $conn->send(json_encode(['type' => 'error', 'message' => 'Access denied']));
                return;
            }
        }

        // Add to room
        if (!isset($this->rooms[$roomId])) {
            $this->rooms[$roomId] = [
                'connections' => [],
                'document' => null,
            ];
        }

        $this->rooms[$roomId]['connections'][$conn->resourceId] = [
            'id' => $conn->userId,
            'name' => $conn->userName,
            'color' => $conn->userColor,
            'connection' => $conn,
        ];

        // Send current document state
        if ($this->rooms[$roomId]['document']) {
            $conn->send(json_encode([
                'type' => 'document-state',
                'document' => $this->rooms[$roomId]['document'],
            ]));
        }

        // Notify others that user joined
        $this->broadcastToRoom($roomId, [
            'type' => 'user-joined',
            'user' => [
                'id' => $conn->userId,
                'name' => $conn->userName,
                'color' => $conn->userColor,
            ],
        ], $conn);

        // Send list of current users
        $users = array_map(function($user) {
            return [
                'id' => $user['id'],
                'name' => $user['name'],
                'color' => $user['color'],
            ];
        }, $this->rooms[$roomId]['connections']);

        $conn->send(json_encode([
            'type' => 'room-users',
            'users' => $users,
        ]));
    }

    protected function handleLeaveRoom(ConnectionInterface $conn, array $data)
    {
        $roomId = $data['roomId'] ?? null;
        if (!$roomId || !isset($this->rooms[$roomId])) {
            return;
        }

        if (isset($this->rooms[$roomId]['connections'][$conn->resourceId])) {
            $user = $this->rooms[$roomId]['connections'][$conn->resourceId];
            unset($this->rooms[$roomId]['connections'][$conn->resourceId]);

            // Notify others
            $this->broadcastToRoom($roomId, [
                'type' => 'user-left',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'color' => $user['color'],
                ],
            ], $conn);

            // Clean up empty rooms
            if (empty($this->rooms[$roomId]['connections'])) {
                unset($this->rooms[$roomId]);
            }
        }
    }

    protected function handleSyncUpdate(ConnectionInterface $conn, array $data)
    {
        $roomId = $data['roomId'] ?? null;
        $update = $data['update'] ?? null;

        if (!$roomId || !$update || !isset($this->rooms[$roomId])) {
            return;
        }

        // Store latest document state
        $this->rooms[$roomId]['document'] = $update;

        // Broadcast to all other users in the room
        $this->broadcastToRoom($roomId, [
            'type' => 'sync-update',
            'update' => $update,
            'userId' => $conn->userId,
        ], $conn);

        // Persist to database (debounced)
        $this->scheduleDocumentSave($roomId, $update);
    }

    protected function handlePresenceUpdate(ConnectionInterface $conn, array $data)
    {
        $roomId = $data['roomId'] ?? null;
        $presence = $data['presence'] ?? null;

        if (!$roomId || !isset($this->rooms[$roomId])) {
            return;
        }

        // Update user presence in room
        if (isset($this->rooms[$roomId]['connections'][$conn->resourceId])) {
            $this->rooms[$roomId]['connections'][$conn->resourceId]['presence'] = $presence;
        }

        // Broadcast presence to others
        $this->broadcastToRoom($roomId, [
            'type' => 'presence-update',
            'userId' => $conn->userId,
            'presence' => $presence,
        ], $conn);
    }

    protected function broadcastToRoom(string $roomId, array $message, ConnectionInterface $exclude = null)
    {
        if (!isset($this->rooms[$roomId])) {
            return;
        }

        $messageJson = json_encode($message);
        
        foreach ($this->rooms[$roomId]['connections'] as $user) {
            $connection = $user['connection'];
            if ($connection !== $exclude) {
                $connection->send($messageJson);
            }
        }
    }

    protected function scheduleDocumentSave(string $roomId, $document)
    {
        // Extract drawing ID from room ID
        if (preg_match('/^drawing-(\d+)$/', $roomId, $matches)) {
            $drawingId = $matches[1];
            
            // Use Redis to debounce saves
            $key = "tldraw:save:{$drawingId}";
            Redis::setex($key, 2, json_encode($document));
            
            // In production, you'd have a separate worker process that
            // monitors these keys and saves to database
        }
    }
}
