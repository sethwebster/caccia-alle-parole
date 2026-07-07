import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadCurrentStreak } from '@/features/parola/parola-logic';
import { loadJSON } from '@/lib/storage';

export type PlayerStats = {
	hydrated: boolean;
	parolaStreak: number;
	anagrammiScore: number;
	anagrammiStreak: number;
};

const INITIAL: PlayerStats = {
	hydrated: false,
	parolaStreak: 0,
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
			Promise.all([loadCurrentStreak(), loadJSON<unknown>(ANAGRAMMI_KEY)]).then(
				([parolaStreak, rawAnagrammi]) => {
					if (!alive) return;
					const anagrammi = parseAnagrammi(rawAnagrammi);
					setStats({
						hydrated: true,
						parolaStreak,
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
