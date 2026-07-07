import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadJSON, removeKey, saveJSON } from '@/lib/storage';

const KEY = 'profile:username:v1';

export const MAX_USERNAME_LENGTH = 20;

export type UsernameState = {
	hydrated: boolean;
	/** Empty string when the player has not set a name yet. */
	username: string;
	saveUsername: (name: string) => void;
};

/** Persisted display name, refreshed every time the screen regains focus. */
export function useUsername(): UsernameState {
	const [state, setState] = useState({ hydrated: false, username: '' });

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			void loadJSON<unknown>(KEY).then((raw) => {
				if (!alive) return;
				setState({ hydrated: true, username: typeof raw === 'string' ? raw : '' });
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	const saveUsername = useCallback((name: string) => {
		const trimmed = name.trim().slice(0, MAX_USERNAME_LENGTH);
		setState({ hydrated: true, username: trimmed });
		if (trimmed) {
			void saveJSON(KEY, trimmed);
		} else {
			void removeKey(KEY);
		}
	}, []);

	return { ...state, saveUsername };
}
