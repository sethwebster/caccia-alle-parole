import { useEffect } from 'react';

import type { DailyChallenge } from '@/features/home/use-home-data';

import { syncStreakReminder } from './streak-reminder';

export function useStreakReminder(daily: DailyChallenge): void {
	const finishedToday = daily.status === 'completed';

	useEffect(() => {
		if (!daily.hydrated) return;
		void syncStreakReminder(finishedToday);
		// `daily` is a fresh object per Home focus, so the schedule re-syncs on
		// every visit — this is what upgrades tomorrow's one-shot back to daily.
	}, [daily, finishedToday]);
}
