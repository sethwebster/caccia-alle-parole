import { ITALIAN_WORD_BLOB } from '@/data/italian-words';
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

// Built on first lookup rather than at import: a 173k-entry Set is pure waste
// until a board is actually played, and app launch should not pay for it.
let dictionary: Set<string> | null = null;

function buildDictionary(): Set<string> {
	// The generated lexicon is already uppercase and accent-free, so it needs no
	// per-word normalization — the dominant cost of building this Set.
	const words = new Set(ITALIAN_WORD_BLOB.split('\n'));
	// The Wordle list and word database still carry what the lexicon omits by
	// construction: 11+ letter forms, plus the acronyms and loanwords
	// ("BLOG", "USB") the rest of the game already treats as words.
	for (const word of validWords) words.add(normalizeWord(word));
	for (const entries of Object.values(wordDatabase)) {
		for (const { word } of entries) {
			const normalized = normalizeWord(word);
			if (/^[A-Z]{3,}$/.test(normalized)) words.add(normalized);
		}
	}
	// Daily boards deliberately preserve one theme word as an adjacent path.
	// Keep their editorial vocabulary canonical even when a longer word is
	// absent from the general-purpose lexicon.
	for (const theme of THEMES) {
		for (const word of theme.puzzleWords.paroliere) words.add(normalizeWord(word));
	}
	return words;
}

export function isValidWord(word: string): boolean {
	dictionary ??= buildDictionary();
	return dictionary.has(normalizeWord(word));
}
