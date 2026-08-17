import { describe, expect, it } from 'vitest';

import { wordleWords } from '@/data/wordle-data';
import { THEMES } from '@/features/daily/catalog-content';

import { isValidWord, lookupWord } from './dictionary';

describe('canonical dictionary', () => {
	it('accepts unaccented board spellings of accented Italian words', () => {
		for (const word of ['TRIBU', 'CITTA', 'CAFFE', 'PERCHE']) expect(isValidWord(word)).toBe(true);
	});

	it('accepts everyday short words the old 5-letter-only lexicon could not', () => {
		const words = ['CHE', 'CHI', 'CON', 'NON', 'UNA', 'TRA', 'POI', 'ORA', 'VIA', 'DUE', 'ARIA', 'BENE', 'FINE', 'ZONA', 'VITA', 'VOCE'];

		expect(words.filter((word) => !isValidWord(word))).toEqual([]);
	});

	it('rejects letter runs that spell nothing', () => {
		for (const word of ['XQZ', 'ZZZZ', 'QQQQ', 'ABCD']) expect(isValidWord(word)).toBe(false);
	});

	// wiktextract emits `form_of: "avere and"` for the auxiliaries, which normalized
	// to a lemma that does not exist and silently dropped the most common verb in Italian.
	it('resolves irregular auxiliary and verb forms to their lemma', () => {
		expect(lookupWord('HANNO')?.lemma).toBe('avere');
		expect(lookupWord('SIAMO')?.lemma).toBe('essere');
		expect(lookupWord('FANNO')?.lemma).toBe('fare');
		expect(lookupWord('VANNO')?.lemma).toBe('andare');
	});

	it('explains an inflected form through its lemma', () => {
		const meaning = lookupWord('PARLIAMO');

		expect(meaning?.lemma).toBe('parlare');
		expect(meaning?.pos).toBe('verb');
		expect(meaning?.english.length).toBeGreaterThan(0);
	});

	it('defines every word it accepts', () => {
		for (const word of ['CASA', 'SCOGLIO', 'GHEPARDO', 'MANGIATO', 'CHE']) {
			expect(isValidWord(word)).toBe(true);
			expect(lookupWord(word)?.english.length ?? 0).toBeGreaterThan(0);
		}
	});

	it('returns nothing for a word it does not accept', () => {
		expect(lookupWord('ZZZZ')).toBeNull();
	});
});

// Every one of these was a real defect caught during the cutover: a target the
// dictionary rejects cannot be typed, so the puzzle becomes unwinnable.
describe('canonical dictionary covers what the games ship', () => {
	it('accepts every Parola target', () => {
		expect(wordleWords.filter((entry) => !isValidWord(entry.word)).map((entry) => entry.word)).toEqual([]);
	});

	it('accepts every word the daily puzzles embed', () => {
		const embedded = THEMES.flatMap((theme) => [...theme.puzzleWords.parola, ...theme.puzzleWords.paroliere, ...theme.puzzleWords.caccia, ...theme.puzzleWords.anagrammi]);

		expect(embedded.filter((word) => !isValidWord(word))).toEqual([]);
	});
});
