import React, { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'zettly-pwa-install-dismissed';

const isDismissed = () => {
    try {
        if (typeof window === 'undefined') return true;
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

const setDismissed = () => {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, '1');
        }
    } catch {
        // Ignore localStorage quota or access restriction errors
    }
};

const shouldSkipPrompt = () => {
    if (typeof window === 'undefined') {
        return true;
    }

    try {
        const matchesStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
        const isStandalone = matchesStandalone || window.navigator.standalone === true || document.referrer.includes('android-app://');
        return Boolean(isStandalone || isDismissed());
    } catch {
        return false;
    }
};

const isIosDevice = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);
    const [promptMode, setPromptMode] = useState(null); // "event" | "ios"

    useEffect(() => {
        const forceShow = typeof window !== 'undefined' && window.localStorage.getItem('zettly-pwa-force-show') === 'true';

        if (shouldSkipPrompt() && !forceShow) {
            return undefined;
        }

        if (forceShow && isDebugMode()) {
            console.debug('[PWA] Force showing install prompt');
            setPromptMode('event');
            setVisible(true);
        }

        if (isIosDevice() && !shouldSkipPrompt()) {
            console.debug('[PWA] iOS device detected');
            setPromptMode('ios');
            setVisible(true);
        }

        const handler = (event) => {
            console.debug('[PWA] beforeinstallprompt event fired');
            if (shouldSkipPrompt() && !forceShow) {
                return;
            }
            // Stash the event so it can be triggered later.
            setDeferredPrompt(event);
            setPromptMode('event');
            setVisible(true);
        };

        const appInstalledHandler = () => {
            console.debug('[PWA] appinstalled event fired');
            setDismissed();
            setVisible(false);
            setDeferredPrompt(null);
            setPromptMode(null);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', appInstalledHandler);

        if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
            navigator.getInstalledRelatedApps().then((apps) => {
                if (apps && apps.length > 0) {
                    setDismissed();
                    setVisible(false);
                    setDeferredPrompt(null);
                    setPromptMode(null);
                }
            }).catch(() => {});
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', appInstalledHandler);
        };
    }, []);

    // Helper to check debug mode from app.jsx logic
    const isDebugMode = () => {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem('zettly-debug-mode') === 'true';
            }
        } catch {
            return false;
        }
        return false;
    };

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();

        try {
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setDismissed();
            }
        } catch (error) {
            console.error('PWA install prompt failed', error);
        } finally {
            // Once user triggers install dialog, record dismissal so it does not nag again
            setDismissed();
            setDeferredPrompt(null);
            setVisible(false);
            setPromptMode(null);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setDismissed();
        setVisible(false);
        setDeferredPrompt(null);
        setPromptMode(null);
    }, []);

    const isDev = import.meta.env.DEV;

    if (!visible) {
        if (isDev && isDebugMode()) {
            return (
                <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-orange-500/10 border border-orange-500/20 p-2 text-[10px] text-orange-600 dark:text-orange-400 backdrop-blur">
                    PWA: Event not yet captured. Try refreshing or use a private window.
                </div>
            );
        }
        return null;
    }

    const DevHint = () => (
        isDev && (
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-slate-800">
                <p className="text-[10px] leading-tight text-gray-400 dark:text-gray-500 italic">
                    Note: Browser banners are often suppressed on localhost. If "Install app" doesn't show a browser dialog, try using a mobile device or production build.
                </p>
            </div>
        )
    );

    if (promptMode === 'ios') {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-80">
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Install Zettly</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Tap the share button <span aria-hidden="true">(⌄)</span> and choose <strong>Add to Home Screen</strong> to install Zettly on your iPhone or iPad.
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                        >
                            Got it
                        </button>
                    </div>
                    <DevHint />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-80">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Install Zettly</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Add Zettly to your home screen for quick access even when you&apos;re offline.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleInstall}
                        className="flex-1 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                        Install app
                    </button>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                    >
                        Maybe later
                    </button>
                </div>
                <DevHint />
            </div>
        </div>
    );
}
