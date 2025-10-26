import { useEffect, useState } from 'react';

/**
 * Hook to detect if the app is running in PWA standalone mode
 * and whether it's on a tablet device
 */
export default function usePwaMode() {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return () => {};
        }

        // Check if running in standalone mode
        const matchesStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
        const isStandaloneMode = matchesStandalone || window.navigator.standalone;
        setIsStandalone(isStandaloneMode);

        // Detect tablet: screen width >= 768px (iPad, Android tablets)
        const isTabletDevice = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isTabletUA = /ipad|android/.test(userAgent);
            const screenWidth = window.innerWidth;
            return isTabletUA || screenWidth >= 768;
        };

        const isTabletValue = isTabletDevice();
        setIsTablet(isTabletValue);

        // Debug logging
        console.log('[usePwaMode]', {
            isStandalone: isStandaloneMode,
            isTablet: isTabletValue,
            userAgent: window.navigator.userAgent,
            screenWidth: window.innerWidth,
            displayMode: window.matchMedia?.('(display-mode: standalone)')?.matches ? 'standalone' : 'browser',
            orientationType: window.screen?.orientation?.type ?? 'unsupported',
        });

        // Listen for orientation changes
        const handleOrientationChange = () => {
            const newIsTablet = isTabletDevice();
            setIsTablet(newIsTablet);
            console.log('[usePwaMode] Orientation changed, isTablet:', newIsTablet, 'type:', window.screen?.orientation?.type);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return () => {};
        }

        if (!isStandalone || !isTablet) {
            return () => {};
        }

        const orientation = window.screen?.orientation;
        if (!orientation || typeof orientation.lock !== 'function') {
            console.log('[usePwaMode] Screen Orientation API not available');
            return () => {};
        }

        let cancelled = false;
        let unlockTimer = null;

        const requestLandscape = () => {
            if (cancelled) {
                return;
            }

            const currentType = orientation.type ?? '';
            if (currentType.startsWith('landscape')) {
                console.log('[usePwaMode] Already in landscape orientation');
                return;
            }

            orientation
                .lock('landscape')
                .then(() => {
                    console.log('[usePwaMode] Locked orientation to landscape');
                    if (typeof orientation.unlock === 'function') {
                        unlockTimer = window.setTimeout(() => {
                            if (!cancelled) {
                                orientation.unlock();
                                console.log('[usePwaMode] Orientation unlocked to allow rotation');
                            }
                        }, 1500);
                    }
                })
                .catch((error) => {
                    console.warn('[usePwaMode] Failed to lock orientation', error);
                });
        };

        requestLandscape();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestLandscape();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            if (unlockTimer) {
                window.clearTimeout(unlockTimer);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isStandalone, isTablet]);

    return { isStandalone, isTablet };
}
