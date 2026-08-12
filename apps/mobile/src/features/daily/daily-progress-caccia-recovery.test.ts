import { describe, expect, it } from 'vitest';

import { createDailyChallengeGame } from '@/features/caccia/word-search-daily';

import { resolveDailyChallengeBundle, type DailyCatalogBundle, type DailyCatalogPuzzlePayload } from './catalog';
import { makeChallengeId } from './date';
import { createDailyProgressStore } from './progress';
import { migrateStoredDailyProgress } from './progress-migration';
import { DAILY_PROGRESS_KEY, DAILY_PROGRESS_SCHEMA_VERSION, makeProgressReady, type ProgressStorageAdapter } from './progress-model';
import type { ChallengeId } from './types';

class MemoryProgressStorage implements ProgressStorageAdapter {
	readonly values = new Map<string, string>();
	readonly operations: { readonly kind: 'get' | 'set'; readonly key: string }[] = [];

	async getItem(key: string): Promise<string | null> {
		this.operations.push({ kind: 'get', key });
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.operations.push({ kind: 'set', key });
		this.values.set(key, value);
	}
}

type CacciaCatalogPayload = Extract<DailyCatalogPuzzlePayload, { readonly words: readonly unknown[] }>;

function readyBundle(challengeId: ChallengeId): DailyCatalogBundle {
	const resolution = resolveDailyChallengeBundle({ challengeId });
	expect(resolution.kind).toBe('ready');
	if (resolution.kind !== 'ready') throw new Error('expected ready bundle');
	return resolution.bundle;
}

function cacciaPayload(bundle: DailyCatalogBundle): CacciaCatalogPayload {
	const puzzle = bundle.puzzles.find((candidate) => candidate.key === 'caccia');
	expect(puzzle).toBeDefined();
	if (puzzle === undefined) throw new Error('expected Caccia puzzle');
	if (!('words' in puzzle.payload)) throw new Error('expected Caccia payload');
	return puzzle.payload;
}

function canonicalProgressWithBundle(bundle: DailyCatalogBundle) {
	return makeProgressReady({
		schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION,
		challenges: [{ challengeId: bundle.challengeId, source: bundle.source, bundleSnapshot: bundle, migrationStatus: 'fresh', inProgressPuzzles: [], replayAttempts: [] }],
		credits: [],
		mutationEventIds: [],
	});
}

function mapCacciaPayload(bundle: DailyCatalogBundle, mapPayload: (payload: CacciaCatalogPayload) => CacciaCatalogPayload): DailyCatalogBundle {
	return {
		...bundle,
		puzzles: bundle.puzzles.map((puzzle) => puzzle.key === 'caccia' && 'words' in puzzle.payload ? { ...puzzle, payload: mapPayload(puzzle.payload) } : puzzle),
	};
}

function corruptFirstNonDefaultCacciaWord(bundle: DailyCatalogBundle): DailyCatalogBundle {
	return mapCacciaPayload(bundle, (payload) => ({
		...payload,
		words: payload.words.map((word, index) => index === 1 ? { ...word, row: 0, col: 0, direction: 'horizontal' } : word),
	}));
}

function corruptFirstCacciaCells(bundle: DailyCatalogBundle): DailyCatalogBundle {
	return mapCacciaPayload(bundle, (payload) => ({
		...payload,
		words: payload.words.map((word, index) => index === 1 ? { ...word, cells: word.cells.map((cell, cellIndex) => cellIndex === 0 ? { ...cell, row: cell.row + 1 } : cell) } : word),
	}));
}

function corruptFirstCacciaTuple(bundle: DailyCatalogBundle): DailyCatalogBundle {
	return mapCacciaPayload(bundle, (payload) => ({
		...payload,
		words: payload.words.map((word, index) => index === 1 ? { ...word, row: word.row + 1, col: word.col, direction: word.direction } : word),
	}));
}

async function expectOk<T>(result: Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }>): Promise<T> {
	const settled = await result;
	expect(settled.ok).toBe(true);
	if (!settled.ok) throw new Error('expected ok result');
	return settled.value;
}

describe('daily-progress canonical Caccia recovery', () => {
	it('migrates canonical v2 Caccia snapshots with exact old default placement metadata', () => {
		const originalBundle = readyBundle(makeChallengeId('2026-01-26'));
		const expectedPlacement = cacciaPayload(originalBundle).words[1];
		const bundle = corruptFirstNonDefaultCacciaWord(originalBundle);

		const result = migrateStoredDailyProgress(JSON.stringify(canonicalProgressWithBundle(bundle)), 'canonical');

		expect(result.kind).toBe('migrated');
		if (result.kind !== 'migrated') throw new Error('expected migrated canonical progress');
		const migratedBundle = result.progress.challenges[0]?.bundleSnapshot;
		expect(migratedBundle).toBeDefined();
		if (migratedBundle === undefined) throw new Error('expected migrated bundle');
		const payload = cacciaPayload(migratedBundle);
		expect(payload.words[1]?.row).toBe(expectedPlacement?.row);
		expect(payload.words[1]?.col).toBe(expectedPlacement?.col);
		expect(payload.words[1]?.direction).toBe(expectedPlacement?.direction);
		expect(() => createDailyChallengeGame(payload)).not.toThrow();
	});

	it('keeps canonical v2 Caccia snapshots ready when placement metadata already matches cells', () => {
		const progress = canonicalProgressWithBundle(readyBundle(makeChallengeId('2026-01-26')));

		const result = migrateStoredDailyProgress(JSON.stringify(progress), 'canonical');

		expect(result).toEqual({ kind: 'ready', progress });
	});

	it('rejects canonical v2 Caccia snapshots with invalid cells', () => {
		const bundle = corruptFirstCacciaCells(readyBundle(makeChallengeId('2026-01-26')));

		const result = migrateStoredDailyProgress(JSON.stringify(canonicalProgressWithBundle(bundle)), 'canonical');

		expect(result).toEqual({ kind: 'unrecoverable', reason: 'invalidShape' });
	});

	it('rejects canonical v2 Caccia snapshots with non-default wrong placement metadata', () => {
		const bundle = corruptFirstCacciaTuple(readyBundle(makeChallengeId('2026-01-26')));

		const result = migrateStoredDailyProgress(JSON.stringify(canonicalProgressWithBundle(bundle)), 'canonical');

		expect(result).toEqual({ kind: 'unrecoverable', reason: 'invalidShape' });
	});

	it('recommits migrated canonical Caccia progress so reload renders repaired placements', async () => {
		const storage = new MemoryProgressStorage();
		const bundle = corruptFirstNonDefaultCacciaWord(readyBundle(makeChallengeId('2026-01-26')));
		storage.values.set(DAILY_PROGRESS_KEY, JSON.stringify(canonicalProgressWithBundle(bundle)));

		const state = await expectOk(createDailyProgressStore(storage).load());
		const reloaded = await expectOk(createDailyProgressStore(storage).load());

		expect(state.kind).toBe('ready');
		expect(reloaded.kind).toBe('ready');
		if (reloaded.kind !== 'ready') throw new Error('expected reloaded progress');
		const reloadedBundle = reloaded.progress.challenges[0]?.bundleSnapshot;
		expect(reloadedBundle).toBeDefined();
		if (reloadedBundle === undefined) throw new Error('expected reloaded bundle');
		const payload = cacciaPayload(reloadedBundle);
		expect(payload.words[1]?.row).toBe(payload.words[1]?.cells[0]?.row);
		expect(payload.words[1]?.col).toBe(payload.words[1]?.cells[0]?.col);
		expect(() => createDailyChallengeGame(payload)).not.toThrow();
		expect(storage.operations.map((operation) => `${operation.kind}:${operation.key}`)).toEqual([
			`get:${DAILY_PROGRESS_KEY}`,
			`set:${DAILY_PROGRESS_KEY}`,
			`get:${DAILY_PROGRESS_KEY}`,
			`get:${DAILY_PROGRESS_KEY}`,
		]);
	});
});
