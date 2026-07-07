import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadCurrentStreak, loadSavedState, MAX_GUESSES } from '@/features/parola/parola-logic';

export type DailyChallenge = {
	hydrated: boolean;
	streak: number;
	attempts: number;
	maxAttempts: number;
	status: 'new' | 'playing' | 'won' | 'lost';
};

const INITIAL: DailyChallenge = {
	hydrated: false,
	streak: 0,
	attempts: 0,
	maxAttempts: MAX_GUESSES,
	status: 'new',
};

/** Today's Paròle progress + win streak, refreshed every time Home regains focus. */
export function useHomeData(): DailyChallenge {
	const [data, setData] = useState<DailyChallenge>(INITIAL);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			Promise.all([loadSavedState(), loadCurrentStreak()]).then(([saved, streak]) => {
				if (!alive) return;
				const attempts = saved?.guesses.length ?? 0;
				const status =
					saved == null || attempts === 0
						? 'new'
						: saved.gameState === 'playing'
							? 'playing'
							: saved.gameState;
				setData({ hydrated: true, streak, attempts, maxAttempts: MAX_GUESSES, status });
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	return data;
}
