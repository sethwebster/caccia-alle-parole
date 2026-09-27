import { dictionaryWords, normalizeWord } from '@/lib/dictionary';

import { isTraceable } from './board-quality';

/** All unscored words on this board, using the game's full dictionary and path rules. */
export function findMissedWords(
	grid: readonly (readonly string[])[],
	foundWords: readonly string[],
	words: Iterable<string> = dictionaryWords(),
): string[] {
	const letters = grid.flat();
	const budget = new Map<string, number>();
	for (const letter of letters) budget.set(letter, (budget.get(letter) ?? 0) + 1);
	const found = new Set(foundWords.map(normalizeWord));
	const missed = new Set<string>();
	for (const candidate of words) {
		const word = normalizeWord(candidate);
		if (word.length < 3 || word.length > letters.length || found.has(word) || missed.has(word)) continue;
		const used = new Map<string, number>();
		let fits = true;
		for (const letter of word) {
			const count = (used.get(letter) ?? 0) + 1;
			if (count > (budget.get(letter) ?? 0)) { fits = false; break; }
			used.set(letter, count);
		}
		if (fits && isTraceable(grid, word)) missed.add(word);
	}
	return [...missed].sort((a, b) => b.length - a.length || a.localeCompare(b, 'it'));
}
