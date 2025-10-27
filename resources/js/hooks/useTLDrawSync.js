import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

/**
 * Custom hook to integrate TLDraw sync with Laravel backend using Pusher
 */
export function useTLDrawSync(drawingId) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const channelRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Generate a unique client ID
    const clientId = useRef(`client-${Math.random().toString(36).substr(2, 9)}`);

    // Initialize Pusher connection for TLDraw sync
    const initializeSync = useCallback(async () => {
        if (!drawingId || !window.Echo) return;

        try {
            // Clean up existing connection
            if (channelRef.current) {
                window.Echo.leave(`tldraw-${drawingId}`);
                channelRef.current = null;
            }

            // Join the drawing channel
            const channel = window.Echo.private(`tldraw-${drawingId}`);
            channelRef.current = channel;

            // Listen for sync events
            channel.listen('TLDrawUpdate', (e) => {
                console.log('[TLDraw Sync] Received update:', e);
                // Handle incoming updates
                if (e.onSyncUpdate) {
                    e.onSyncUpdate(e.document);
                }
            });

            channel.listen('UserJoined', (e) => {
                console.log('[TLDraw Sync] User joined:', e.user);
                setConnectedUsers(prev => {
                    const filtered = prev.filter(u => u.id !== e.user.id);
                    return [...filtered, e.user];
                });
            });

            channel.listen('UserLeft', (e) => {
                console.log('[TLDraw Sync] User left:', e.user);
                setConnectedUsers(prev => prev.filter(u => u.id !== e.user.id));
            });

            channel.listen('PresenceUpdate', (e) => {
                console.log('[TLDraw Sync] Presence update:', e);
                setConnectedUsers(prev => 
                    prev.map(u => u.id === e.userId ? { ...u, ...e.presence } : u)
                );
            });

            // Subscribe to presence for real-time user list
            const presenceChannel = window.Echo.join(`tldraw-${drawingId}-presence`);
            
            presenceChannel.here((users) => {
                console.log('[TLDraw Sync] Users already here:', users);
                setConnectedUsers(users);
                setCurrentUser(users.find(u => u.id === window.auth?.user?.id));
                setIsConnected(true);
            });

            presenceChannel.joining((user) => {
                console.log('[TLDraw Sync] User joining:', user);
                setConnectedUsers(prev => [...prev, user]);
            });

            presenceChannel.leaving((user) => {
                console.log('[TLDraw Sync] User leaving:', user);
                setConnectedUsers(prev => prev.filter(u => u.id !== user.id));
            });

            presenceChannel.error((error) => {
                console.error('[TLDraw Sync] Presence channel error:', error);
            });

        } catch (error) {
            console.error('[TLDraw Sync] Failed to initialize:', error);
            setIsConnected(false);
        }
    }, [drawingId]);

    // Send document updates
    const sendUpdate = useCallback(async (document) => {
        if (!drawingId || !isConnected) return;

        try {
            await axios.post(`/tldraw/sync/update/${drawingId}`, {
                document,
                clientId: clientId.current,
            });
        } catch (error) {
            console.error('[TLDraw Sync] Failed to send update:', error);
        }
    }, [drawingId, isConnected]);

    // Send presence updates
    const updatePresence = useCallback((presence) => {
        if (!drawingId || !isConnected) return;

        try {
            axios.post(`/tldraw/sync/presence/${drawingId}`, {
                presence,
                clientId: clientId.current,
            });
        } catch (error) {
            console.error('[TLDraw Sync] Failed to update presence:', error);
        }
    }, [drawingId, isConnected]);

    // Initialize on mount and drawingId change
    useEffect(() => {
        initializeSync();

        return () => {
            if (channelRef.current) {
                window.Echo.leave(`tldraw-${drawingId}`);
                channelRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [drawingId, initializeSync]);

    // Asset store for file uploads
    const assetStore = {
        upload: async (file, asset) => {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('drawingId', drawingId);

                const response = await axios.post('/tldraw/sync/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                return {
                    src: response.data.url,
                    ...response.data,
                };
            } catch (error) {
                console.error('[TLDraw Sync] Upload failed:', error);
                throw error;
            }
        },
        resolve: async (asset) => {
            return asset.props.src;
        },
    };

    return {
        store: null, // Using custom sync implementation
        isConnected,
        currentUser,
        connectedUsers,
        sendUpdate,
        updatePresence,
        assetStore,
    };
}

/**
 * Hook for handling user presence (cursors, selections)
 */
export function useTLDrawPresence(drawingId) {
    const { connectedUsers, updatePresence } = useTLDrawSync(drawingId);
    
    return {
        users: connectedUsers,
        updatePresence,
    };
}
export function createTLDrawStore(drawingId, onSyncUpdate) {
    const { sendUpdate, updatePresence } = useTLDrawSync(drawingId);

    return {
        // Store methods for TLDraw
        putSnapshot: async (snapshot) => {
            await sendUpdate(snapshot);
        },
        
        // Presence methods
        updatePresence,
        
        // Asset handling
        assetStore: {
            upload: async (file, asset) => {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('drawingId', drawingId);

                    const response = await axios.post('/tldraw/sync/upload', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    return {
                        src: response.data.url,
                        ...response.data,
                    };
                } catch (error) {
                    console.error('[TLDraw Sync] Upload failed:', error);
                    throw error;
                }
            },
            resolve: async (asset) => {
                return asset.props.src;
            },
        },
    };
}
