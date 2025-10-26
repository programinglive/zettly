import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import * as Sentry from '@sentry/react';

export function usePushNotifications() {
    const [permission, setPermission] = useState(() =>
        typeof Notification === 'undefined' ? 'default' : Notification.permission
    );
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
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
            setPermission(result);

            if (result === 'granted') {
                // Pass true to skip state check since we just got permission
                await subscribe(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to request notification permission', error);
            return false;
        }
    }, [isSupported]);

    const subscribe = useCallback(async (permissionGranted = false) => {
        const hasPermission = permissionGranted || permission === 'granted';
        if (!isSupported || !hasPermission) {
            return false;
        }

        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                console.warn('Cannot subscribe to push: no service worker registration');
                return false;
            }
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    document.querySelector('meta[name="vapid-public-key"]')?.content || ''
                ),
            });

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                console.warn('Push subscription could not locate CSRF token meta tag.');
            }

            await axios.post(
                '/push-subscriptions',
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        auth: arrayBufferToBase64(subscription.getKey('auth')),
                        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                    },
                },
                csrfToken
                    ? {
                          headers: {
                              'X-CSRF-TOKEN': csrfToken,
                              Accept: 'application/json',
                          },
                      }
                    : {
                          headers: {
                              Accept: 'application/json',
                          },
                      }
            );
            setIsSubscribed(true);
            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications', error);
            Sentry.captureException(error, {
                tags: {
                    component: 'usePushNotifications',
                    action: 'subscribe',
                },
                contexts: {
                    push: {
                        isSupported,
                        permission,
                        hasRegistration: !!registration,
                    },
                },
            });
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
                return true;
            }

            setIsSubscribed(false);
            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications', error);
            Sentry.captureException(error, {
                tags: {
                    component: 'usePushNotifications',
                    action: 'unsubscribe',
                },
            });
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
