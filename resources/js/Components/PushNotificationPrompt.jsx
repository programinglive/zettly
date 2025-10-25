import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { usePushNotifications } from '../hooks/usePushNotifications';

const STORAGE_KEY = 'zettly-notifications-dismissed';

export default function PushNotificationPrompt() {
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        requestPermission,
        subscribe,
        unsubscribe,
    } = usePushNotifications();
    const showTestButton = String(import.meta.env.VITE_ENABLE_PUSH_TEST_BUTTON).toLowerCase() === 'true';
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const val = window.localStorage.getItem(STORAGE_KEY) === '1';
        console.debug('[push-prompt] Initial dismissed state', val, 'storage:', window.localStorage.getItem(STORAGE_KEY));
        return val;
    });
    const [visible, setVisible] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const val = window.localStorage.getItem(STORAGE_KEY) !== '1';
        console.debug('[push-prompt] Initial visible state', val, 'storage:', window.localStorage.getItem(STORAGE_KEY));
        return val;
    });
    const [testStatus, setTestStatus] = useState('idle');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleStorage = (event) => {
            if (event.key !== STORAGE_KEY) {
                return;
            }

            const hidden = event.newValue === '1';
            setDismissed(hidden);
        };

        window.addEventListener('storage', handleStorage);

        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        console.debug('[push-prompt] Visibility check', {
            isSupported,
            dismissed,
            permission,
            isSubscribed,
            storageValue: typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : 'N/A',
        });

        if (!isSupported) {
            console.debug('[push-prompt] Not supported, hiding');
            setVisible(false);
            return;
        }

        if (dismissed) {
            console.debug('[push-prompt] Dismissed, hiding');
            setVisible(false);
            return;
        }

        const shouldShow = permission !== 'granted' || !isSubscribed;
        console.debug('[push-prompt] Should show?', shouldShow, { permission, isSubscribed });
        setVisible(shouldShow);
    }, [isSupported, permission, isSubscribed, dismissed]);

    const handleDismiss = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, '1');
        }
        setDismissed(true);
        setVisible(false);
        setTestStatus('idle');
    }, []);

    const handleReopen = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEY);
        }
        setDismissed(false);
        setVisible(true);
    }, []);

    const handleEnable = useCallback(async () => {
        const granted = await requestPermission();
        if (!granted) {
            setVisible(false);
        }
    }, [requestPermission]);

    const handleDisable = useCallback(async () => {
        await unsubscribe();
        setTestStatus('idle');
    }, [unsubscribe]);

    const handleSendTest = useCallback(async () => {
        if (testStatus === 'sending') {
            return;
        }

        setTestStatus('sending');
        try {
            if (!isSubscribed) {
                const subscribed = await subscribe();
                if (!subscribed) {
                    setTestStatus('error');
                    return;
                }
            }

            await axios.post('/push/test', {
                title: 'Zettly Notifications Enabled',
                body: 'This is a sample push notification. Tap to open your dashboard.',
                url: '/dashboard',
            });
            setTestStatus('sent');
        } catch (error) {
            console.error('Failed to send test notification', error);
            setTestStatus('error');
        }
    }, [testStatus, isSubscribed, subscribe]);

    const message = useMemo(() => {
        if (!isSupported) {
            return 'Your browser does not support push notifications.';
        }

        if (permission === 'denied') {
            return 'Notifications are blocked. Enable them in your browser settings to receive alerts.';
        }

        if (permission === 'granted' || isSubscribed) {
            if (showTestButton) {
                return 'Notifications are enabled. Send yourself a test alert or disable them anytime.';
            }

            return 'Notifications are enabled. You can disable them anytime in the banner below.';
        }

        return 'Enable push notifications to get real-time updates without keeping this page open.';
    }, [isSupported, permission, isSubscribed, showTestButton]);

    const needsAttention = permission !== 'granted' || !isSubscribed;

    console.debug('[push-prompt] Render check', { isSupported, visible });

    if (!isSupported) {
        console.debug('[push-prompt] Not rendering (unsupported)');
        return null;
    }

    if (!visible) {
        const showReopenButton = dismissed && needsAttention;
        const showManageButton = !needsAttention && isSubscribed;
        console.debug('[push-prompt] Not rendering banner (visible false). Show reopen?', showReopenButton, 'Show manage?', showManageButton);

        if (showReopenButton) {
            return (
                <div className="fixed bottom-4 right-4 z-50">
                    <button
                        type="button"
                        onClick={handleReopen}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Enable notifications
                    </button>
                </div>
            );
        }

        if (showManageButton) {
            return (
                <div className="fixed bottom-4 right-4 z-50">
                    <button
                        type="button"
                        onClick={handleDisable}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        disabled={isLoading}
                    >
                        Disable notifications
                    </button>
                </div>
            );
        }

        return null;
    }

    const showEnableActions = permission === 'default' && !isSubscribed;
    const showDeniedActions = permission === 'denied';
    const showEnabledActions = permission === 'granted' || isSubscribed;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-80">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Enable notifications</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{message}</p>
                </div>

                {showEnableActions && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleEnable}
                            disabled={isLoading}
                            className="flex-1 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                        >
                            {isLoading ? 'Requesting…' : 'Enable notifications'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                        >
                            Maybe later
                        </button>
                    </div>
                )}

                {showDeniedActions && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {showEnabledActions && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                            {showTestButton && (
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={testStatus === 'sending'}
                                    className="flex-1 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                >
                                    {testStatus === 'sending' ? 'Sending…' : 'Send test notification'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleDisable}
                                disabled={isLoading}
                                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                            >
                                Disable
                            </button>
                        </div>
                        {showTestButton ? (
                            <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                                <span>
                                    {testStatus === 'sent'
                                        ? 'Test notification sent. Check your device.'
                                        : testStatus === 'error'
                                        ? 'Unable to send test notification. Check console logs.'
                                        : 'Notifications stay in sync even when the app is closed.'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="font-medium text-gray-500 underline decoration-dotted hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Hide
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-end text-[11px] text-gray-400 dark:text-gray-500">
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="font-medium text-gray-500 underline decoration-dotted hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Hide
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
