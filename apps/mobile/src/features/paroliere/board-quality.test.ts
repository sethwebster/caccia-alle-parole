import { describe, expect, it } from 'vitest';

import { ITALIAN_LETTER_POOL } from '@/lib/italian-letters';
import { createSeededRandom, randomIndex } from '@/lib/seeded-random';

import {
	BOARD_SIZE,
	MAX_VOWELS,
	MIN_TRACEABLE_WORDS,
	MIN_VOWELS,
	countVowels,
	generateBoard,
	isTraceable,
	scoreBoard,
} from './board-quality';

const SAMPLE_SIZE = 100;
/** Scoring every sampled board against the curated word list is the slow part. */
const SAMPLE_TIMEOUT_MS = 60_000;

function seeds(count: number): string[] {
	return Array.from({ length: count }, (_, index) => `paroliere-board-sample:${index}`);
}

function sampleBoards(count: number): string[][][] {
	return seeds(count).map((seed) => generateBoard(createSeededRandom(seed)));
}

/** An unfiltered draw from the same pool: the baseline rejection sampling has to beat. */
function drawUnfiltered(seed: string): string[][] {
	const random = createSeededRandom(seed);
	return Array.from({ length: BOARD_SIZE }, () =>
		Array.from(
			{ length: BOARD_SIZE },
			() => ITALIAN_LETTER_POOL[randomIndex(random, ITALIAN_LETTER_POOL.length)] ?? 'A',
		),
	);
}

describe('paroliere board quality metric', () => {
	const canonicalGrid = [
		['M', 'A', 'R', 'E'],
		['S', 'O', 'L', 'E'],
		['L', 'U', 'N', 'A'],
		['V', 'E', 'N', 'T'],
	];

	it('traces a word that follows adjacent unused tiles', () => {
		expect(isTraceable(canonicalGrid, 'MARE')).toBe(true);
		expect(isTraceable(canonicalGrid, 'SOLE')).toBe(true);
	});

	it('refuses a word that would reuse the same tile twice', () => {
		// One S on the board, so OSSO cannot be drawn without reusing it.
		const grid = [
			['O', 'S', 'X', 'X'],
			['X', 'O', 'X', 'X'],
			['X', 'X', 'X', 'X'],
			['X', 'X', 'X', 'X'],
		];

		expect(isTraceable(grid, 'OSSO')).toBe(false);
	});

	it('refuses a word whose letters are not adjacent', () => {
		const grid = [
			['M', 'X', 'X', 'A'],
			['X', 'X', 'X', 'X'],
			['X', 'X', 'X', 'X'],
			['R', 'X', 'X', 'E'],
		];

		expect(isTraceable(grid, 'MARE')).toBe(false);
	});

	it('counts curated words a player could actually find', () => {
		const quality = scoreBoard(canonicalGrid);

		expect(quality.traceableWords).toContain('MARE');
		expect(quality.wordCount).toBe(quality.traceableWords.length);
		expect(quality.vowelCount).toBe(7);
		expect(quality.longestWord).toBeGreaterThanOrEqual(4);
	});
});

describe('paroliere board generation', () => {
	it('is deterministic for a given seed', () => {
		const first = generateBoard(createSeededRandom('repeatable'));
		const second = generateBoard(createSeededRandom('repeatable'));

		expect(first).toEqual(second);
	});

	it('does not bake a fixed board into normal generation', () => {
		const boards = sampleBoards(SAMPLE_SIZE);
		const distinct = new Set(boards.map((board) => board.flat().join('')));

		// Issue #28: "avoid baking a single fixed board into normal generation".
		// Distinct-per-seed is the property that regressed when generation was
		// reduced to a rotation of hardcoded rows.
		expect(distinct.size).toBeGreaterThan(SAMPLE_SIZE * 0.95);
	}, SAMPLE_TIMEOUT_MS);

	it('keeps every generated board inside the vowel window', () => {
		for (const board of sampleBoards(SAMPLE_SIZE)) {
			expect(countVowels(board)).toBeGreaterThanOrEqual(MIN_VOWELS);
			expect(countVowels(board)).toBeLessThanOrEqual(MAX_VOWELS);
		}
	}, SAMPLE_TIMEOUT_MS);

	it('rejects more vowel-starved boards than an unfiltered draw from the same pool', () => {
		const generated = sampleBoards(SAMPLE_SIZE).filter((board) => countVowels(board) < MIN_VOWELS).length;
		const unfiltered = seeds(SAMPLE_SIZE).map(drawUnfiltered).filter((board) => countVowels(board) < MIN_VOWELS).length;

		expect(generated).toBeLessThan(unfiltered);
	}, SAMPLE_TIMEOUT_MS);

	/**
	 * Guards the calibrated floor. The uncalibrated baseline — the same seeds and
	 * pool, vowel window only, MIN_TRACEABLE_WORDS inert at 0 — measured min 0,
	 * p25 3, median 6, p75 8, max 16, mean 6.02. MIN_TRACEABLE_WORDS is set to 4
	 * from that lower quartile, so rejection sampling should now clear the bottom
	 * quarter and the zero-word tail.
	 *
	 * Not asserted as "every board", because exhausting MAX_GENERATION_ATTEMPTS
	 * returns the best sample by design rather than a fixed grid; a board below the
	 * floor is that fallback working, not a regression. The distribution stays
	 * printed so the numbers above can be re-derived when the pool changes.
	 */
	it('lifts the traceable-word distribution above the calibrated floor', () => {
		const counts = sampleBoards(SAMPLE_SIZE)
			.map((board) => scoreBoard(board).wordCount)
			.sort((left, right) => left - right);
		const percentile = (fraction: number): number => counts[Math.floor((counts.length - 1) * fraction)] ?? 0;

		console.log('traceable words per board', {
			min: counts[0],
			p25: percentile(0.25),
			median: percentile(0.5),
			p75: percentile(0.75),
			max: counts[counts.length - 1],
			mean: counts.reduce((total, value) => total + value, 0) / counts.length,
			belowFloor: counts.filter((count) => count < MIN_TRACEABLE_WORDS).length,
		});

		expect(counts.length).toBe(SAMPLE_SIZE);
		// Baseline p25 was 3, below the floor; sampling should pull the quartile up.
		expect(percentile(0.25)).toBeGreaterThanOrEqual(MIN_TRACEABLE_WORDS);
		expect(counts.filter((count) => count >= MIN_TRACEABLE_WORDS).length).toBeGreaterThanOrEqual(
			SAMPLE_SIZE * 0.95,
		);
	}, SAMPLE_TIMEOUT_MS);
});
