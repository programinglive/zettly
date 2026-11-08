const CACHE_NAME = 'zettly-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/site.webmanifest',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Skip API, Sanctum, Pusher, WebSocket, or cross-origin requests
    if (
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/sanctum') ||
        url.pathname.startsWith('/broadcasting') ||
        url.origin !== self.location.origin
    ) {
        return;
    }

    // Network-first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone).catch(() => {});
                    });
                }
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(request);
                if (cached) {
                    return cached;
                }
                if (request.mode === 'navigate') {
                    const rootCached = await caches.match('/');
                    if (rootCached) {
                        return rootCached;
                    }
                }
                throw new Error('Offline and not cached');
            })
    );
});

self.addEventListener('push', (event) => {
    console.log('[SW] Push event received', event);
    
    if (!event.data) {
        console.log('[SW] No push data');
        return;
    }

    let payload = {};

    try {
        payload = event.data.json();
        console.log('[SW] Parsed push payload', payload);
    } catch (error) {
        console.error('[SW] Failed to parse push payload', error);
    }

    const title = payload.title || 'Zettly';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/android-chrome-192x192.png',
        badge: payload.badge || '/android-chrome-192x192.png',
        data: {
            url: payload.url || '/',
            ...payload.data,
        },
        tag: payload.tag || 'zettly',
        renotify: payload.renotify ?? false,
        requireInteraction: payload.requireInteraction ?? false,
    };

    console.log('[SW] Showing notification:', title, options);
    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => console.log('[SW] Notification shown successfully'))
            .catch(err => console.error('[SW] Failed to show notification', err))
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    const url = new URL(client.url, self.location.origin);
                    const normalizedTarget = new URL(targetUrl, self.location.origin);

                    if (url.pathname === normalizedTarget.pathname) {
                        return client.focus();
                    }
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

            return undefined;
        })
    );
});
