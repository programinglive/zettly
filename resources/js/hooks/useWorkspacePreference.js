import { useEffect, useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';

import { DEFAULT_WORKSPACE_VIEW, WORKSPACE_STORAGE_KEY } from '../constants/workspace';
import { resolveCsrfToken, refreshCsrfToken } from '../utils/csrf';

// Custom event for workspace preference changes
const WORKSPACE_CHANGE_EVENT = 'workspace-preference-changed';

export default function useWorkspacePreference(initialPreference = null) {
    const { props } = usePage();
    const serverPreference = props?.preferences?.workspace_view ?? initialPreference;

    const [workspaceView, setWorkspaceViewState] = useState(() => {
        if (serverPreference) {
            return serverPreference;
        }

        if (typeof window === 'undefined') {
            return DEFAULT_WORKSPACE_VIEW;
        }

        return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || DEFAULT_WORKSPACE_VIEW;
    });

    const setWorkspaceView = useCallback((value) => {
        if (typeof window === 'undefined') {
            return;
        }

        let shouldUpdate = false;
        let previousValue = workspaceView;

        setWorkspaceViewState((prev) => {
            if (prev === value) {
                return prev;
            }

            shouldUpdate = true;
            previousValue = prev;
            return value;
        });

        if (!shouldUpdate) {
            return;
        }

        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, value);

        // Broadcast immediately so other hook instances stay in sync optimistically
        window.dispatchEvent(
            new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { value } })
        );

        const submitPreference = async (attempt = 0) => {
            try {
                let token = resolveCsrfToken();

                if (!token) {
                    token = await refreshCsrfToken();
                }

                await axios.post(
                    '/profile/workspace-preference',
                    { workspace_view: value },
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        withCredentials: true,
                    }
                );
            } catch (error) {
                const status = error?.response?.status;

                if (status === 419 && attempt < 1) {
                    await refreshCsrfToken();
                    return submitPreference(attempt + 1);
                }

                if (import.meta.env.DEV) {
                    console.error('[workspace-preference] Failed to persist preference', error);
                }

                setWorkspaceViewState(previousValue);
                window.localStorage.setItem(WORKSPACE_STORAGE_KEY, previousValue);
                window.dispatchEvent(
                    new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { value: previousValue } })
                );
            }
        };

        submitPreference();
    }, []);

    useEffect(() => {
        if (serverPreference && serverPreference !== workspaceView) {
            setWorkspaceViewState(serverPreference);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serverPreference);
            }
        }
    }, [serverPreference]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return () => { };
        }

        // Sync state with localStorage on mount
        if (!serverPreference) {
            const storedValue = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
            if (storedValue && storedValue !== workspaceView) {
                setWorkspaceViewState(storedValue);
            }
        }

        // Listen for workspace preference changes from other components
        const handleWorkspaceChange = (event) => {
            setWorkspaceViewState(event.detail.value);
        };

        window.addEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange);

        return () => {
            window.removeEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange);
        };
    }, [serverPreference, workspaceView]);

    return [workspaceView, setWorkspaceView];
}
