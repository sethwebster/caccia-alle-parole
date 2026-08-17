import { useCallback, useState } from 'react';

import { lookupWord, type WordMeaning } from '@/lib/dictionary';

export type SelectedWordMeaning = WordMeaning & { readonly found: string };

/**
 * Tap-to-define, shared by every game that shows words back to the player.
 * The lookup is synchronous, so selection state is all this needs to own.
 */
export function useWordMeaning(): {
	readonly selected: SelectedWordMeaning | null;
	readonly select: (word: string) => void;
	readonly dismiss: () => void;
} {
	const [selected, setSelected] = useState<SelectedWordMeaning | null>(null);

	const select = useCallback((word: string) => {
		const meaning = lookupWord(word);
		// Every playable word comes from the dictionary, so a miss means the caller
		// passed something the player never traced — nothing worth opening a sheet for.
		if (meaning !== null) setSelected({ ...meaning, found: word });
	}, []);

	const dismiss = useCallback(() => setSelected(null), []);

	return { selected, select, dismiss };
}
