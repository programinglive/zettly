self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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
