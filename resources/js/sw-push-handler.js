/**
 * Inject push event handlers into the generated service worker.
 * This runs after the service worker is registered.
 */

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
        // Handle incoming push messages
        self.addEventListener('push', (event) => {
            if (!event.data) {
                return;
            }

            let payload = {};

            try {
                payload = event.data.json();
            } catch (error) {
                console.error('Failed to parse push payload', error);
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

            event.waitUntil(registration.showNotification(title, options));
        });

        // Handle notification clicks
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
    });
}
