import { useEffect, useState } from 'react';

/**
 * Hook to detect if the app is running in PWA standalone mode
 * and whether it's on a tablet device
 */
export default function usePwaMode() {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
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
        if (typeof window !== 'undefined') {
            console.log('[usePwaMode]', {
                isStandalone: isStandaloneMode,
                isTablet: isTabletValue,
                userAgent: window.navigator.userAgent,
                screenWidth: window.innerWidth,
                displayMode: window.matchMedia?.('(display-mode: standalone)')?.matches ? 'standalone' : 'browser',
            });
        }

        // Listen for orientation changes
        const handleOrientationChange = () => {
            const newIsTablet = isTabletDevice();
            setIsTablet(newIsTablet);
            console.log('[usePwaMode] Orientation changed, isTablet:', newIsTablet);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    return { isStandalone, isTablet };
}
