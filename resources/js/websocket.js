import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Configure Pusher
window.Pusher = Pusher;

// Build Pusher options
const pusherOptions = {
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
        },
    },
};

// Add cluster if available
if (import.meta.env.VITE_PUSHER_APP_CLUSTER) {
    pusherOptions.cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;
}

// Add custom host if available (for self-hosted or specific configurations)
if (import.meta.env.VITE_PUSHER_HOST) {
    pusherOptions.wsHost = import.meta.env.VITE_PUSHER_HOST;
    pusherOptions.wssHost = import.meta.env.VITE_PUSHER_HOST;
    pusherOptions.wsPort = import.meta.env.VITE_PUSHER_PORT ?? 80;
    pusherOptions.wssPort = import.meta.env.VITE_PUSHER_PORT ?? 443;
    pusherOptions.forceTLS = (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https';
    pusherOptions.enabledTransports = ['ws', 'wss'];
    pusherOptions.disableStats = true;
} else {
    // Use standard Pusher hosts when no custom host is specified
    pusherOptions.forceTLS = true;
    pusherOptions.enabledTransports = ['ws', 'wss'];
    pusherOptions.disableStats = true;
}

// Initialize Echo with error handling
try {
    if (!import.meta.env.VITE_PUSHER_APP_KEY) {
        console.warn('[WebSocket] Pusher app key not configured. Live updates disabled.');
        window.Echo = null;
    } else {
        // Check if user is authenticated before initializing Echo
        const isAuthenticated = document.querySelector('meta[name="user-id"]')?.content || 
                               document.querySelector('meta[name="csrf-token"]')?.content;
        
        if (!isAuthenticated) {
            console.warn('[WebSocket] User not authenticated. Live updates disabled.');
            window.Echo = null;
        } else {
            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: import.meta.env.VITE_PUSHER_APP_KEY,
                authorizer: (channel) => {
                    return {
                        authorize: (socketId, callback) => {
                            const payload = {
                                socket_id: socketId,
                                channel_name: channel.name,
                            };

                            // Prefer axios (configured in bootstrap.js) to ensure cookies and CSRF are sent
                            if (window.axios) {
                                window.axios
                                    .post('/broadcasting/auth', payload, { withCredentials: true })
                                    .then((res) => {
                                        const data = res?.data;
                                        const status = res?.status;
                                        
                                        // Log response details for debugging
                                        console.log('[WebSocket] Auth response:', {
                                            status,
                                            data,
                                            dataType: typeof data,
                                            channel: channel.name
                                        });
                                        
                                        // Check if response is actually JSON
                                        if (typeof data === 'string') {
                                            if (data.trim() === '') {
                                                console.error('[WebSocket] Auth returned empty string response');
                                                callback(true, { error: 'Empty response from auth endpoint' });
                                                return;
                                            }
                                            
                                            console.error('[WebSocket] Auth returned non-JSON body (string):', data);
                                            // Try to parse if it's supposed to be JSON
                                            try {
                                                const parsed = JSON.parse(data);
                                                console.log('[WebSocket] Authorized channel (parsed):', channel.name);
                                                callback(false, parsed);
                                            } catch (e) {
                                                console.error('[WebSocket] Failed to parse string response:', e);
                                                callback(true, { error: 'Invalid response from auth endpoint' });
                                            }
                                            return;
                                        }
                                        
                                        if (!data || typeof data !== 'object') {
                                            console.error('[WebSocket] Auth returned invalid response:', data);
                                            callback(true, { error: 'Invalid response from auth endpoint' });
                                            return;
                                        }
                                        
                                        console.log('[WebSocket] Authorized channel:', channel.name);
                                        callback(false, data);
                                    })
                                    .catch((err) => {
                                        const status = err?.response?.status;
                                        const respData = err?.response?.data;
                                        console.error('[WebSocket] Authorization failed', { 
                                            status, 
                                            respData,
                                            channel: channel.name,
                                            url: '/broadcasting/auth',
                                            responseType: typeof respData
                                        });
                                        
                                        // If we get HTML response (like a login page), it means user is not authenticated
                                        if (typeof respData === 'string' && respData.includes('<html')) {
                                            console.error('[WebSocket] User appears to be unauthenticated - received HTML response');
                                            callback(true, { error: 'User not authenticated' });
                                        } else if (status === 419) {
                                            console.error('[WebSocket] CSRF token mismatch');
                                            callback(true, { error: 'CSRF token expired' });
                                        } else if (status === 401) {
                                            console.error('[WebSocket] User not authenticated');
                                            callback(true, { error: 'User not authenticated' });
                                        } else {
                                            callback(true, respData || { error: 'Authorization failed' });
                                        }
                                    });
                            } else {
                                // Fallback to fetch
                                const token = document.querySelector('meta[name="csrf-token"]')?.content;
                                fetch('/broadcasting/auth', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-TOKEN': token || '',
                                    },
                                    body: JSON.stringify(payload),
                                    credentials: 'same-origin',
                                })
                                    .then(async (r) => {
                                        const text = await r.text();
                                        try {
                                            const json = JSON.parse(text);
                                            console.log('[WebSocket] Authorized channel:', channel.name);
                                            callback(false, json);
                                        } catch (e) {
                                            console.error('[WebSocket] Auth returned non-JSON body');
                                            callback(true, { error: 'Invalid JSON from auth endpoint' });
                                        }
                                    })
                                    .catch((e) => {
                                        console.error('[WebSocket] Authorization request error', e);
                                        callback(true, { error: 'Authorization request failed' });
                                    });
                            }
                        },
                    };
                },
                ...pusherOptions,
            });
            
            // Log connection status for debugging
            window.Echo.connector.pusher.connection.bind('connected', () => {
                console.log('[WebSocket] Connected to Pusher');
            });
            
            window.Echo.connector.pusher.connection.bind('error', (err) => {
                console.error('[WebSocket] Connection error:', err);
            });
            
            window.Echo.connector.pusher.connection.bind('disconnected', () => {
                console.warn('[WebSocket] Disconnected from Pusher');
            });
        }
    }
} catch (error) {
    console.error('[WebSocket] Failed to initialize Echo:', error);
    window.Echo = null;
}

export default window.Echo;
