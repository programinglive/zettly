import { router } from '@inertiajs/react';

const getCookie = (name) => {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch (error) {
        return match[1];
    }
};

export const getCookieCsrfToken = () => getCookie('XSRF-TOKEN');

export const getMetaCsrfToken = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    return tokenMeta?.content ?? null;
};

export const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;

    if (inertiaToken) {
        return inertiaToken;
    }

    const cookieToken = getCookieCsrfToken();

    if (cookieToken) {
        return cookieToken;
    }

    return getMetaCsrfToken();
};

export const refreshCsrfToken = async () => {
    try {
        await fetch('/sanctum/csrf-cookie', {
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('[csrf] Failed to refresh CSRF cookie', error);
        }
    }

    const token = resolveCsrfToken();

    if (typeof document !== 'undefined' && token) {
        const tokenMeta = document.querySelector('meta[name="csrf-token"]');

        if (tokenMeta) {
            tokenMeta.setAttribute('content', token);
        }
    }

    return token;
};
