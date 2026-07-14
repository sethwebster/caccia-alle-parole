import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadDailyStatsSummary } from '@/features/daily/progress';
import { loadJSON } from '@/lib/storage';

export type PlayerStats = {
	hydrated: boolean;
	dailyChallengeStreak: number;
	dailyChallengeMaxStreak: number;
	dailyChallengeCompletions: number;
	dailyChallengeAllWon: number;
	dailyChallengePerfect: number;
	anagrammiScore: number;
	anagrammiStreak: number;
};

const INITIAL: PlayerStats = {
	hydrated: false,
	dailyChallengeStreak: 0,
	dailyChallengeMaxStreak: 0,
	dailyChallengeCompletions: 0,
	dailyChallengeAllWon: 0,
	dailyChallengePerfect: 0,
	anagrammiScore: 0,
	anagrammiStreak: 0,
};

const ANAGRAMMI_KEY = 'anagrammi:progress:v1';

function parseAnagrammi(raw: unknown): { score: number; streak: number } {
	if (raw && typeof raw === 'object') {
		const { score, streak } = raw as { score?: unknown; streak?: unknown };
		return {
			score: typeof score === 'number' ? score : 0,
			streak: typeof streak === 'number' ? streak : 0,
		};
	}
	return { score: 0, streak: 0 };
}

/** Persisted cross-game stats, refreshed every time the screen regains focus. */
export function usePlayerStats(): PlayerStats {
	const [stats, setStats] = useState<PlayerStats>(INITIAL);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			Promise.all([loadDailyStatsSummary(), loadJSON<unknown>(ANAGRAMMI_KEY)]).then(
				([dailyStats, rawAnagrammi]) => {
					if (!alive) return;
					const anagrammi = parseAnagrammi(rawAnagrammi);
					setStats({
						hydrated: true,
						dailyChallengeStreak: dailyStats.currentStreak,
						dailyChallengeMaxStreak: dailyStats.maxStreak,
						dailyChallengeCompletions: dailyStats.completedOfficialChallenges,
						dailyChallengeAllWon: dailyStats.allWonOfficialChallenges,
						dailyChallengePerfect: dailyStats.perfectOfficialChallenges,
						anagrammiScore: anagrammi.score,
						anagrammiStreak: anagrammi.streak,
					});
				},
			);
			return () => {
				alive = false;
			};
		}, []),
	);

	return stats;
}
