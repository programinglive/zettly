import { useEffect, useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';

import { DEFAULT_WORKSPACE_VIEW, WORKSPACE_STORAGE_KEY } from '../constants/workspace';

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

        setWorkspaceViewState((prev) => {
            if (prev === value) {
                return prev;
            }

            shouldUpdate = true;
            return value;
        });

        if (!shouldUpdate) {
            return;
        }

        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, value);

        if (router?.post) {
            router.post(
                '/profile/workspace-preference',
                { workspace_view: value },
                { preserveScroll: true, preserveState: true }
            );
        }

        // Dispatch custom event so other instances of this hook update
        window.dispatchEvent(
            new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { value } })
        );
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
            return () => {};
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
