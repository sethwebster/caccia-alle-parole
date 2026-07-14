import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadJSON, saveJSON } from '@/lib/storage';

// Stores just the filename: the document-directory path changes across reinstalls.
const KEY = 'profile:avatar:v1';

export type AvatarState = {
	hydrated: boolean;
	/** file:// URI of the saved profile picture, or null when unset. */
	avatarUri: string | null;
	pickAvatar: () => Promise<void>;
};

function uriFor(filename: unknown): string | null {
	if (typeof filename !== 'string' || !filename) return null;
	const file = new File(Paths.document, filename);
	return file.exists ? file.uri : null;
}

/** Persisted profile picture; pickAvatar opens the system photo library. */
export function useAvatar(): AvatarState {
	const [state, setState] = useState<{ hydrated: boolean; avatarUri: string | null }>({
		hydrated: false,
		avatarUri: null,
	});

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			void loadJSON<unknown>(KEY).then((filename) => {
				if (!alive) return;
				setState({ hydrated: true, avatarUri: uriFor(filename) });
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	const pickAvatar = useCallback(async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});
		if (result.canceled) return;

		const previous = await loadJSON<unknown>(KEY);
		// Timestamped name so expo-image never serves a stale cache entry.
		const filename = `avatar-${Date.now()}.jpg`;
		const dest = new File(Paths.document, filename);
		new File(result.assets[0].uri).copy(dest);
		await saveJSON(KEY, filename);
		if (typeof previous === 'string' && previous) {
			const old = new File(Paths.document, previous);
			if (old.exists) old.delete();
		}
		setState({ hydrated: true, avatarUri: dest.uri });
	}, []);

	return { ...state, pickAvatar };
}
