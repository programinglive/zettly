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
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: import.meta.env.VITE_PUSHER_APP_KEY,
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
} catch (error) {
    console.error('[WebSocket] Failed to initialize Echo:', error);
    window.Echo = null;
}

export default window.Echo;
