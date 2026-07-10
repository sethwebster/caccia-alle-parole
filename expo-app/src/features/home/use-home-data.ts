import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { challengeIdForDate } from '@/features/daily/date';
import { loadDailyChallengeStatusSummary, loadDailyStatsSummary } from '@/features/daily/progress';

export type DailyChallenge = {
	hydrated: boolean;
	streak: number;
	attempts: number;
	maxAttempts: number;
	status: 'new' | 'playing' | 'completed';
};

const INITIAL: DailyChallenge = {
	hydrated: false,
	streak: 0,
	attempts: 0,
	maxAttempts: 5,
	status: 'new',
};

export function useHomeData(): DailyChallenge {
	const [data, setData] = useState<DailyChallenge>(INITIAL);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			Promise.all([loadDailyChallengeStatusSummary(challengeIdForDate()), loadDailyStatsSummary()]).then(([daily, stats]) => {
				if (!alive) return;
				setData({ hydrated: true, streak: stats.currentStreak, attempts: daily.terminalEvents, maxAttempts: daily.totalPuzzles, status: daily.status });
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	return data;
}
