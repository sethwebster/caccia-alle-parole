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
