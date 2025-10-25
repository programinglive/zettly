import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationPrompt() {
    const { isSupported, isSubscribed, permission } = usePushNotifications();

    useEffect(() => {
        console.debug('[push-prompt] Legacy banner removed. Current state:', {
            isSupported,
            isSubscribed,
            permission,
        });
    }, [isSupported, isSubscribed, permission]);

    return null;
}
