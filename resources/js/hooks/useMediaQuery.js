import { useEffect, useState } from 'react';

export default function useMediaQuery(query) {
    const getMatches = () => {
        if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
            return false;
        }

        return window.matchMedia(query).matches;
    };

    const [matches, setMatches] = useState(getMatches);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
            return () => {};
        }

        const mediaQueryList = window.matchMedia(query);
        const listener = (event) => setMatches(event.matches);

        mediaQueryList.addEventListener('change', listener);
        setMatches(mediaQueryList.matches);

        return () => {
            mediaQueryList.removeEventListener('change', listener);
        };
    }, [query]);

    return matches;
}
