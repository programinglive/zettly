import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Log version for debugging with cache busting
const version = import.meta.env.VITE_APP_VERSION || '0.5.36';
const timestamp = Date.now();
console.log(`🚀 Zettly v${version} (${timestamp}) - WebSocket Module Loaded`);

// Force cache invalidation for Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            console.log('[WebSocket] Unregistering service worker to force cache refresh');
            registration.unregister();
        });
    });
}

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
        // Enable Pusher debug mode
        Pusher.logToConsole = true;
        console.log('[WebSocket] Pusher debug logging enabled');
        
        // Check if user is authenticated before initializing Echo
        const isAuthenticated = document.querySelector('meta[name="user-id"]')?.content || 
                               document.querySelector('meta[name="csrf-token"]')?.content;
        
        if (!isAuthenticated) {
            console.warn('[WebSocket] User not authenticated. Live updates disabled.');
            window.Echo = null;
        } else {
            console.log('[WebSocket] Initializing Echo with Pusher');
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

                            console.log('[WebSocket] === AUTHORIZATION START ===');
                            console.log('[WebSocket] Channel:', channel.name);
                            console.log('[WebSocket] Socket ID:', socketId);
                            console.log('[WebSocket] Payload:', payload);

                            // Prefer axios (configured in bootstrap.js) to ensure cookies and CSRF are sent
                            if (window.axios) {
                                console.log('[WebSocket] Using axios for authorization');
                                
                                window.axios
                                    .post('/broadcasting/auth', payload, { withCredentials: true })
                                    .then((res) => {
                                        const data = res?.data;
                                        const status = res?.status;
                                        
                                        console.log('[WebSocket] === AUTH RESPONSE ===');
                                        console.log('[WebSocket] Status:', status);
                                        console.log('[WebSocket] Data:', data);
                                        console.log('[WebSocket] Channel data type:', typeof data?.channel_data);
                                        console.log('[WebSocket] Channel data valid JSON:', data?.channel_data && typeof data.channel_data === 'string' ? 'YES' : 'NO');
                                        
                                        if (!data || typeof data !== 'object') {
                                            console.error('[WebSocket] Invalid response format');
                                            callback(true, { error: 'Invalid response from auth endpoint' });
                                            return;
                                        }
                                        
                                        console.log('[WebSocket] ✅ Authorization successful');
                                        callback(false, data);
                                    })
                                    .catch((err) => {
                                        console.error('[WebSocket] === AUTH ERROR ===');
                                        console.error('[WebSocket] Error:', err);
                                        console.error('[WebSocket] Status:', err?.response?.status);
                                        console.error('[WebSocket] Response data:', err?.response?.data);
                                        callback(true, err?.response?.data || { error: 'Authorization failed' });
                                    });
                            } else {
                                console.error('[WebSocket] Axios not available');
                                callback(true, { error: 'Axios not available' });
                            }
                        },
                    };
                },
                ...pusherOptions,
            });
            
            // Enhanced connection status logging
            window.Echo.connector.pusher.connection.bind('connecting', () => {
                console.log('[WebSocket] 🔄 Connecting to Pusher...');
            });
            
            window.Echo.connector.pusher.connection.bind('connected', () => {
                console.log('[WebSocket] ✅ Connected to Pusher');
                console.log('[WebSocket] Connection ID:', window.Echo.connector.pusher.connection.socket_id);
            });
            
            window.Echo.connector.pusher.connection.bind('disconnected', () => {
                console.log('[WebSocket] ❌ Disconnected from Pusher');
            });
            
            window.Echo.connector.pusher.connection.bind('error', (err) => {
                console.error('[WebSocket] 💥 Connection error:', err);
                console.error('[WebSocket] Error details:', {
                    type: err?.type,
                    error: err?.error?.data,
                    code: err?.error?.data?.code,
                    message: err?.error?.data?.message
                });
            });
            
            // Log all Pusher events for debugging
            window.Echo.connector.pusher.bind_global((eventName, data) => {
                console.log(`[WebSocket] 📡 Pusher event: ${eventName}`, data);
            });
        }
    }
} catch (error) {
    console.error('[WebSocket] Failed to initialize Echo:', error);
    window.Echo = null;
}

export default window.Echo;
