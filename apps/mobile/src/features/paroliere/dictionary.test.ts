import { describe, expect, it } from 'vitest';

import { THEMES } from '@/features/daily/catalog-content';

import { isValidWord } from './dictionary';

describe('paroliere dictionary normalization', () => {
	it('accepts unaccented board spellings of accented Italian words', () => {
		expect(isValidWord('TRIBU')).toBe(true);
		expect(isValidWord('CITTA')).toBe(true);
		expect(isValidWord('CAFFE')).toBe(true);
	});

	it('contains every word deliberately embedded by daily puzzles', () => {
		const embedded = THEMES.flatMap((theme) => theme.puzzleWords.paroliere);

		expect(embedded.filter((word) => !isValidWord(word))).toEqual([]);
		expect(embedded.some((word) => word.length > 6)).toBe(true);
	});
});

// The lexicon used to be the 5-letter Wordle list plus a themed word-search
// corpus, which left 32 three-letter and 146 four-letter words total — short
// traces on a 4x4 board almost never scored.
describe('paroliere dictionary short-word coverage', () => {
	it('accepts everyday Italian three-letter words', () => {
		const words = ['CHE', 'CHI', 'CON', 'NON', 'UNA', 'MIO', 'TUO', 'SUO', 'NOI', 'VOI', 'TRA', 'POI', 'DUE', 'SEI', 'ORA', 'VIA'];

		expect(words.filter((word) => !isValidWord(word))).toEqual([]);
	});

	it('accepts everyday Italian four-letter words', () => {
		const words = ['ARIA', 'BENE', 'FINE', 'ZONA', 'NOTE', 'FILO', 'PESO', 'LATO', 'GIRO', 'CASA', 'MARE', 'SOLE', 'VITA', 'VOCE'];

		expect(words.filter((word) => !isValidWord(word))).toEqual([]);
	});

	it('still rejects letter runs that spell nothing', () => {
		for (const word of ['XQZ', 'ZZZZ', 'QQQQ', 'ABCD']) expect(isValidWord(word)).toBe(false);
	});
});
