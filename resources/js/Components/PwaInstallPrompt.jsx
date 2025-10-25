import React, { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'zettly-pwa-install-dismissed';

const shouldSkipPrompt = () => {
    if (typeof window === 'undefined') {
        return true;
    }

    const matchesStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
    const isStandalone = matchesStandalone || window.navigator.standalone;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';

    return Boolean(isStandalone || dismissed);
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
        if (shouldSkipPrompt()) {
            return undefined;
        }

        if (isIosDevice()) {
            setPromptMode('ios');
            setVisible(true);
        }

        const handler = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
            setPromptMode('event');
            setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();

        try {
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                window.localStorage.setItem(STORAGE_KEY, '1');
            }
        } catch (error) {
            console.error('PWA install prompt failed', error);
        } finally {
            setDeferredPrompt(null);
            setVisible(false);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
        setDeferredPrompt(null);
        setPromptMode(null);
    }, []);

    if (!visible) {
        return null;
    }

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
                        className="flex-1 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
            </div>
        </div>
    );
}
