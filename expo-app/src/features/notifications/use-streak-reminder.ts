import { useEffect } from 'react';

import type { DailyChallenge } from '@/features/home/use-home-data';

import { syncStreakReminder } from './streak-reminder';

/** Re-syncs the 19:00 streak reminder whenever today's Paròle outcome changes. */
export function useStreakReminder(daily: DailyChallenge): void {
	const finishedToday = daily.status === 'won' || daily.status === 'lost';

	useEffect(() => {
		if (!daily.hydrated) return;
		void syncStreakReminder(finishedToday);
		// `daily` is a fresh object per Home focus, so the schedule re-syncs on
		// every visit — this is what upgrades tomorrow's one-shot back to daily.
	}, [daily, finishedToday]);
}
