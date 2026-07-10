import { Platform, Share } from 'react-native';

import type { DailyRouteReadyModel } from './daily-route-model';
import { logDailyShare } from './daily-observe';

export function useDailyShare() {
	return async (model: DailyRouteReadyModel) => {
		if (model.share.kind !== 'available') return;
		logDailyShare({ challengeId: model.challengeId, wins: model.share.wins, streak: model.stats.currentStreak });
		if (Platform.OS === 'web') {
			if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return;
			await navigator.clipboard.writeText(model.share.text);
			return;
		}
		await Share.share({ message: model.share.text });
	};
}
