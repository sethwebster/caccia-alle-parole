import { wordDatabase } from '@/data/word-data';
import { validWords } from '@/data/wordle-valid-words';
import { THEMES } from '@/features/daily/catalog-content';

/** Uppercase + strip combining accents so unaccented grid letters match accented forms. */
function normalizeWord(word: string): string {
	return word
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

// The Wordle list is 5-letter-only; without the word database merged in,
// no 3, 4, or 6+ letter word could ever score. Pure data, built once.
const dictionary = new Set<string>();
for (const word of validWords) dictionary.add(normalizeWord(word));
for (const words of Object.values(wordDatabase)) {
	for (const { word } of words) {
		const normalized = normalizeWord(word);
		if (/^[A-Z]{3,}$/.test(normalized)) dictionary.add(normalized);
	}
}

// Daily boards deliberately preserve one theme word as an adjacent path.
// Keep their editorial vocabulary in the same canonical dictionary even when
// a longer word is absent from the general-purpose word database.
for (const theme of THEMES) {
	for (const word of theme.puzzleWords.paroliere) dictionary.add(normalizeWord(word));
}

export function isValidWord(word: string): boolean {
	return dictionary.has(normalizeWord(word));
}
