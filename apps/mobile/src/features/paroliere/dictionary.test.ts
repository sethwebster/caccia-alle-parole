import { describe, expect, it } from 'vitest';

import { isValidWord } from './dictionary';

describe('paroliere dictionary normalization', () => {
	it('accepts unaccented board spellings of accented Italian words', () => {
		expect(isValidWord('TRIBU')).toBe(true);
		expect(isValidWord('CITTA')).toBe(true);
		expect(isValidWord('CAFFE')).toBe(true);
	});

	it('contains the longer words deliberately embedded by daily puzzles', () => {
		expect(isValidWord('VELIERO')).toBe(true);
		expect(isValidWord('ARPEGGIO')).toBe(true);
	});
});
