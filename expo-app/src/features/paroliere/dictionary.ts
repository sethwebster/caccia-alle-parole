import { wordDatabase } from '@/data/word-data';
import { validWords } from '@/data/wordle-valid-words';

/** Uppercase + strip combining accents so unaccented grid letters match accented forms. */
function normalizeWord(word: string): string {
	return word
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

// The Wordle list is 5-letter-only; without the word database merged in,
// no 3, 4, or 6+ letter word could ever score. Pure data, built once.
const dictionary = new Set<string>(validWords);
for (const words of Object.values(wordDatabase)) {
	for (const { word } of words) {
		const normalized = normalizeWord(word);
		if (/^[A-Z]{3,}$/.test(normalized)) dictionary.add(normalized);
	}
}

export function isValidWord(word: string): boolean {
	return dictionary.has(normalizeWord(word));
}
