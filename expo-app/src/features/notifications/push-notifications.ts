import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** How incoming notifications present while the app is foregrounded. */
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

/**
 * Ensure the Android channel exists and the user granted notification permission.
 * Concurrent callers share one request: a second requestPermissionsAsync issued
 * while the iOS dialog is open resolves "not granted" before the user answers.
 */
export function ensureNotificationPermissionAsync(): Promise<boolean> {
	pendingPermissionRequest ??= ensurePermission().finally(() => {
		pendingPermissionRequest = null;
	});
	return pendingPermissionRequest;
}

let pendingPermissionRequest: Promise<boolean> | null = null;

async function ensurePermission(): Promise<boolean> {
	if (Platform.OS === 'android') {
		// Android 13+ shows the permission prompt only after a channel exists.
		await Notifications.setNotificationChannelAsync('default', {
			name: 'Promemoria',
			importance: Notifications.AndroidImportance.DEFAULT,
			lightColor: '#C33F2E',
		});
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	if (existingStatus === 'granted') return true;
	const { status } = await Notifications.requestPermissionsAsync();
	return status === 'granted';
}

/**
 * Ask permission and fetch the Expo push token.
 * Returns null when the user declines or on a simulator (push needs real hardware).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
	const granted = await ensureNotificationPermissionAsync();
	if (!granted || !Device.isDevice) return null;

	const projectId: string | undefined =
		Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
	if (!projectId) throw new Error('EAS projectId missing from app config');

	const token = await Notifications.getExpoPushTokenAsync({ projectId });
	return token.data;
}
