import { describe, expect, it } from 'vitest';

import { isValidWord } from '@/lib/dictionary';
import { isTraceable } from './board-quality';
import { findMissedWords } from './missed-words';

const grid = ['CASA', 'RENT', 'OPIL', 'MUSE'].map((row) => row.split(''));

describe('missed Boggle words', () => {
	it('excludes found words, short fragments, duplicate forms, impossible paths and reused tiles', () => {
		expect(findMissedWords(grid, ['casa'], ['CASA', 'CÀSA', 'RE', 'REN', 'REN', 'CAR', 'CAC', 'CAM', 'ZZZ']))
			.toEqual(['CAR', 'REN']);
	});
	it('finds diagonals and words longer than the board-quality vocabulary cap', () => {
		expect(findMissedWords(grid, [], ['CEN', 'CASATNEROPIL'])).toEqual(['CASATNEROPIL', 'CEN']);
	});
	it('uses the scoring dictionary and returns only traceable unscored words', () => {
		const missed = findMissedWords(grid, ['CASA']);
		expect(missed).toContain('CANE');
		expect(missed).not.toContain('CASA');
		for (const word of missed) {
			expect(isValidWord(word)).toBe(true);
			expect(isTraceable(grid, word)).toBe(true);
		}
	});
	it('returns an empty list when all available words were found', () => {
		expect(findMissedWords(grid, ['CASA'], ['CASA'])).toEqual([]);
	});
});
