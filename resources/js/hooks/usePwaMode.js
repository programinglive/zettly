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

        setIsTablet(isTabletDevice());

        // Listen for orientation changes
        const handleOrientationChange = () => {
            setIsTablet(isTabletDevice());
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
