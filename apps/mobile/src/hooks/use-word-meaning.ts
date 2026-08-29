import { useCallback, useState } from 'react';

import { lookupWord, type WordMeaning } from '@/lib/dictionary';

export type SelectedWordMeaning = { readonly found: string; readonly meaning: WordMeaning | null };

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
		setSelected({ found: word, meaning: lookupWord(word) });
	}, []);

	const dismiss = useCallback(() => setSelected(null), []);

	return { selected, select, dismiss };
}
