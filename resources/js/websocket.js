import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Debug mode helper function
const isDebugMode = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('zettly-debug-mode') === 'true';
    }
    return false;
};

// Conditional logging function
const debugLog = (...args) => {
    if (isDebugMode()) {
        console.log(...args);
    }
};

const debugWarn = (...args) => {
    if (isDebugMode()) {
        console.warn(...args);
    }
};

const debugError = (...args) => {
    if (isDebugMode()) {
        console.error(...args);
    }
};

// Log version for debugging with cache busting (only in debug mode)
const version = 'v0.5.37'; // This will be updated by git tag
const timestamp = Date.now();
debugLog(`🚀 Zettly ${version} (${timestamp}) - WebSocket Module Loaded`);

// Force cache invalidation for Service Worker (only in debug mode)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            debugLog('[WebSocket] Unregistering service worker to force cache refresh');
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
        debugWarn('[WebSocket] Pusher app key not configured. Live updates disabled.');
        window.Echo = null;
    } else {
        // Enable Pusher debug mode only if debug mode is enabled
        Pusher.logToConsole = isDebugMode();
        debugLog('[WebSocket] Pusher debug logging enabled');
        
        // Listen for debug mode changes to update Pusher logging dynamically
        if (typeof window !== 'undefined') {
            window.addEventListener('zettly:debug-mode-changed', (event) => {
                const { enabled } = event.detail;
                Pusher.logToConsole = enabled;
                if (enabled) {
                    debugLog('[WebSocket] Debug mode enabled - Pusher logging activated');
                } else {
                    console.log('[WebSocket] Debug mode disabled - Pusher logging deactivated');
                }
            });
        }
        
        // Check if user is authenticated before initializing Echo
        const isAuthenticated = document.querySelector('meta[name="user-id"]')?.content || 
                               document.querySelector('meta[name="csrf-token"]')?.content;
        
        if (!isAuthenticated) {
            debugWarn('[WebSocket] User not authenticated. Live updates disabled.');
            window.Echo = null;
        } else {
            debugLog('[WebSocket] Initializing Echo with Pusher');
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

                            debugLog('[WebSocket] === AUTHORIZATION START ===');
                            debugLog('[WebSocket] Channel:', channel.name);
                            debugLog('[WebSocket] Socket ID:', socketId);
                            debugLog('[WebSocket] Payload:', payload);

                            // Prefer axios (configured in bootstrap.js) to ensure cookies and CSRF are sent
                            if (window.axios) {
                                debugLog('[WebSocket] Using axios for authorization');
                                
                                window.axios
                                    .post('/broadcasting/auth', payload, { withCredentials: true })
                                    .then((res) => {
                                        const data = res?.data;
                                        const status = res?.status;
                                        
                                        debugLog('[WebSocket] === AUTH RESPONSE ===');
                                        debugLog('[WebSocket] Status:', status);
                                        debugLog('[WebSocket] Data:', data);
                                        debugLog('[WebSocket] Channel data type:', typeof data?.channel_data);
                                        debugLog('[WebSocket] Channel data valid JSON:', data?.channel_data && typeof data.channel_data === 'string' ? 'YES' : 'NO');
                                        
                                        if (!data || typeof data !== 'object') {
                                            debugError('[WebSocket] Invalid response format');
                                            callback(true, { error: 'Invalid response from auth endpoint' });
                                            return;
                                        }
                                        
                                        debugLog('[WebSocket] ✅ Authorization successful');
                                        callback(false, data);
                                    })
                                    .catch((err) => {
                                        debugError('[WebSocket] === AUTH ERROR ===');
                                        debugError('[WebSocket] Error:', err);
                                        debugError('[WebSocket] Status:', err?.response?.status);
                                        debugError('[WebSocket] Response data:', err?.response?.data);
                                        callback(true, err?.response?.data || { error: 'Authorization failed' });
                                    });
                            } else {
                                debugError('[WebSocket] Axios not available');
                                callback(true, { error: 'Axios not available' });
                            }
                        },
                    };
                },
                ...pusherOptions,
            });
            
            // Enhanced connection status logging
            window.Echo.connector.pusher.connection.bind('connecting', () => {
                debugLog('[WebSocket] 🔄 Connecting to Pusher...');
            });
            
            window.Echo.connector.pusher.connection.bind('connected', () => {
                debugLog('[WebSocket] ✅ Connected to Pusher');
                debugLog('[WebSocket] Connection ID:', window.Echo.connector.pusher.connection.socket_id);
            });
            
            window.Echo.connector.pusher.connection.bind('disconnected', () => {
                debugLog('[WebSocket] ❌ Disconnected from Pusher');
            });
            
            window.Echo.connector.pusher.connection.bind('error', (err) => {
                debugError('[WebSocket] 💥 Connection error:', err);
                debugError('[WebSocket] Error details:', {
                    type: err?.type,
                    error: err?.error?.data,
                    code: err?.error?.data?.code,
                    message: err?.error?.data?.message
                });
            });
            
            // Log all Pusher events for debugging
            window.Echo.connector.pusher.bind_global((eventName, data) => {
                debugLog(`[WebSocket] 📡 Pusher event: ${eventName}`, data);
            });
        }
    }
} catch (error) {
    debugError('[WebSocket] Failed to initialize Echo:', error);
    window.Echo = null;
}

export default window.Echo;
