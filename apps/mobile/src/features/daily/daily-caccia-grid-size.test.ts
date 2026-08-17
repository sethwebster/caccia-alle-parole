import { describe, expect, it } from 'vitest';

import { buildCatalogPuzzle, buildCatalogTheme, pickCatalogTheme } from './catalog-puzzle-builder';
import { THEMES } from './catalog-content';
import { challengeIdAfterDays } from './date';
import { CATALOG_METADATA } from './catalog';

/**
 * Theme seeds carry exactly three curated words per puzzle — the rotation for
 * the other four games depends on that. The daily word search used to ship all
 * three and nothing else, leaving a 10x10 board with three words on it.
 */
describe('daily caccia grid size', () => {
	const challengeIds = Array.from({ length: THEMES.length }, (_, day) => challengeIdAfterDays(CATALOG_METADATA.releaseBaseChallengeId, day));

	it('fills every theme day to six words', () => {
		for (const challengeId of challengeIds) {
			const seed = pickCatalogTheme(challengeId);
			const puzzle = buildCatalogPuzzle(challengeId, 'caccia', seed, buildCatalogTheme(challengeId, seed));
			const payload = puzzle.payload as { readonly words: readonly { readonly word: string }[] };

			expect(payload.words).toHaveLength(6);
		}
	});

	it('keeps the three curated theme words that carry the hidden-theme link', () => {
		for (const challengeId of challengeIds) {
			const seed = pickCatalogTheme(challengeId);
			const puzzle = buildCatalogPuzzle(challengeId, 'caccia', seed, buildCatalogTheme(challengeId, seed));
			const payload = puzzle.payload as { readonly words: readonly { readonly word: string }[] };
			const placed = payload.words.map((word) => word.word);

			expect(seed.puzzleWords.caccia.filter((word) => !placed.includes(word))).toEqual([]);
		}
	});

	it('publishes every word uppercase, accent-free and unique', () => {
		for (const challengeId of challengeIds) {
			const seed = pickCatalogTheme(challengeId);
			const puzzle = buildCatalogPuzzle(challengeId, 'caccia', seed, buildCatalogTheme(challengeId, seed));
			const payload = puzzle.payload as { readonly words: readonly { readonly word: string; readonly translation: string }[] };
			const words = payload.words.map((word) => word.word);

			expect(words.filter((word) => !/^[A-Z]{3,10}$/.test(word))).toEqual([]);
			expect(new Set(words).size).toBe(words.length);
			expect(payload.words.filter((word) => word.translation.length === 0)).toEqual([]);
		}
	});
});
