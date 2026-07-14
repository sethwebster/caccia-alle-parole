import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureNotificationPermissionAsync } from './push-notifications';

const REMINDER_ID = 'streak-reminder';
const REMINDER_HOUR = 19;

export const DAILY_CHALLENGE_REMINDER_CONTENT: Notifications.NotificationContentInput = {
	title: 'Sfida Giornaliera pronta',
	body: 'Cinque giochi e un tema nascosto ti aspettano oggi.',
	data: { url: '/daily' },
};

/**
 * Keep exactly one 19:00 streak reminder scheduled.
 * Not finished today → repeating daily reminder (first fire: next 19:00).
 * Finished today → single reminder tomorrow 19:00, so tonight stays quiet;
 * every Home focus re-syncs, which restores the repeating schedule.
 */
export async function syncStreakReminder(finishedToday: boolean): Promise<void> {
	if (Platform.OS === 'web') return;

	const granted = await ensureNotificationPermissionAsync();
	if (!granted) return;

	await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);

	if (!finishedToday) {
		await Notifications.scheduleNotificationAsync({
			identifier: REMINDER_ID,
			content: DAILY_CHALLENGE_REMINDER_CONTENT,
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.DAILY,
				hour: REMINDER_HOUR,
				minute: 0,
			},
		});
		return;
	}

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(REMINDER_HOUR, 0, 0, 0);
	await Notifications.scheduleNotificationAsync({
		identifier: REMINDER_ID,
		content: DAILY_CHALLENGE_REMINDER_CONTENT,
		trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow },
	});
}
