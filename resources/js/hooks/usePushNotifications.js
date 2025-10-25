import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export function usePushNotifications() {
    const [permission, setPermission] = useState(() =>
        typeof Notification === 'undefined' ? 'default' : Notification.permission
    );
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        console.debug('[push] Support check', { supported });
        setIsSupported(supported);

        if (!supported) {
            return;
        }

        let cancelled = false;

        navigator.serviceWorker
            .getRegistration()
            .then((registration) => {
                if (!registration) {
                    console.warn('No active service worker registration; push disabled');
                    if (!cancelled) {
                        setIsSupported(false);
                    }
                    return null;
                }

                return registration;
            })
            .then((registration) => {
                if (!registration || cancelled) {
                    return;
                }

                return registration.pushManager.getSubscription().then((existing) => {
                    console.debug('[push] Existing subscription found?', Boolean(existing));
                    setIsSubscribed(Boolean(existing));
                });
            })
            .catch((error) => {
                console.error('Failed to inspect push subscription', error);
                if (!cancelled) {
                    setIsSupported(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const requestPermission = useCallback(async () => {
        if (!isSupported) {
            console.warn('Push notifications not supported');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            console.debug('[push] Notification permission result', result);
            setPermission(result);

            if (result === 'granted') {
                const subscribed = await subscribe();
                console.debug('[push] Subscribe after permission granted', subscribed);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to request notification permission', error);
            return false;
        }
    }, [isSupported]);

    const subscribe = useCallback(async () => {
        if (!isSupported || permission !== 'granted') {
            return false;
        }

        console.debug('[push] Attempting subscription', { isSupported, permission });
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                console.warn('Cannot subscribe to push: no service worker registration');
                return false;
            }
            console.debug('[push] Using service worker registration', registration.scope);
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    document.querySelector('meta[name="vapid-public-key"]')?.content || ''
                ),
            });
            console.debug('[push] PushManager.subscribe returned', subscription.endpoint);

            await axios.post('/push-subscriptions', {
                endpoint: subscription.endpoint,
                keys: {
                    auth: arrayBufferToBase64(subscription.getKey('auth')),
                    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                },
            });
            console.debug('[push] Stored subscription with backend');

            setIsSubscribed(true);
            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, permission]);

    const unsubscribe = useCallback(async () => {
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await axios.delete('/push-subscriptions', {
                    data: {
                        endpoint: subscription.endpoint,
                    },
                });

                await subscription.unsubscribe();
                setIsSubscribed(false);
            }

            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        permission,
        isSupported,
        isSubscribed,
        isLoading,
        requestPermission,
        subscribe,
        unsubscribe,
    };
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}
