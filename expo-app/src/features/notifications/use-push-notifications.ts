import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { registerForPushNotificationsAsync } from './push-notifications';

function navigateFromNotification(notification: Notifications.Notification) {
	const url = notification.request.content.data?.url;
	if (typeof url === 'string') router.push(url as never);
}

/**
 * Registers for push notifications and routes notification taps to the
 * screen named by the notification's `data.url` (for example `/parola`).
 * Call once from the root layout.
 */
export function usePushNotifications(): { pushToken: string | null } {
	const [pushToken, setPushToken] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		registerForPushNotificationsAsync().then((token) => {
			if (mounted && token) setPushToken(token);
		});

		// Cold start from a notification tap: the response arrives before
		// listeners mount, so it must be read back explicitly.
		Notifications.getLastNotificationResponseAsync().then((response) => {
			if (mounted && response) navigateFromNotification(response.notification);
		});

		const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
			navigateFromNotification(response.notification);
		});

		return () => {
			mounted = false;
			subscription.remove();
		};
	}, []);

	return { pushToken };
}
