import { Alert } from 'react-native';

import { DAILY_COPY } from './daily-copy';

/**
 * Abandoning burns the once-per-day official attempt, so every abandon path
 * must pass through this confirmation. Screens only — keep react-native
 * imports out of vitest-covered modules.
 */
export function confirmAbandonDailyAttempt(onConfirm: () => void): void {
	Alert.alert(DAILY_COPY.abandon.title, DAILY_COPY.abandon.message, [
		{ text: DAILY_COPY.abandon.cancel, style: 'cancel' },
		{ text: DAILY_COPY.abandon.confirm, style: 'destructive', onPress: onConfirm },
	]);
}
