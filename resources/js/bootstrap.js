import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
const token = document.querySelector('meta[name="csrf-token"]');

if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}

// Initialize Sentry if DSN is provided
if (import.meta.env.VITE_SENTRY_DSN) {
    import('@sentry/react').then(Sentry => {
        Sentry.init({
            dsn: import.meta.env.VITE_SENTRY_DSN,
            environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
            replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
            replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_ONERROR_SAMPLE_RATE ?? 1),
        });
    });
}

// Import WebSocket configuration
import './websocket';
