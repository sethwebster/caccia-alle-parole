import { describe, expect, it, vi } from 'vitest';

import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId } from '@/features/daily/date';
import { DailyProgressMutationQueue, DailyProgressStore } from '@/features/daily/progress';
import type { ProgressStorageAdapter } from '@/features/daily/progress-model';
import type { ChallengeSource, TerminalAttemptContext } from '@/features/daily/types';

import {
	createDailyChallengeGame,
	recordWordSearchGiveUp,
	summarizeWordSearchChallenge,
	WordSearchChallengeValidationError,
	type WordSearchDailyChallengePayload,
} from './word-search-daily';
import { createGame, markWordFound } from './word-search-service';

const canonicalPayload = {
	category: 'Mercato',
	difficulty: 'easy',
	grid: [
		['P', 'A', 'N', 'E'],
		['E', 'R', 'B', 'A'],
		['R', 'I', 'S', 'O'],
		['A', 'P', 'E', 'E'],
	],
	words: [
		{
			word: 'PANE',
			translation: 'bread',
			definition: 'Alimento da forno',
			row: 0,
			col: 0,
			direction: 'horizontal',
			points: 40,
			cells: [
				{ row: 0, col: 0 },
				{ row: 0, col: 1 },
				{ row: 0, col: 2 },
				{ row: 0, col: 3 },
			],
		},
		{
			word: 'PERA',
			translation: 'pear',
			definition: 'Frutto dolce',
			row: 0,
			col: 0,
			direction: 'vertical',
			points: 40,
			cells: [
				{ row: 0, col: 0 },
				{ row: 1, col: 0 },
				{ row: 2, col: 0 },
				{ row: 3, col: 0 },
			],
		},
	],
} satisfies WordSearchDailyChallengePayload;

const terminalContext = {
	challengeId: makeChallengeId('2026-01-26'),
	puzzleKey: 'caccia',
	attemptKind: 'official',
	attemptId: 'attempt-caccia-1',
	terminalEventId: 'terminal-caccia-give-up',
} satisfies TerminalAttemptContext;

const source = {
	kind: 'bundledCatalog',
	epoch: makeCatalogEpoch('daily-v1'),
	version: makeCatalogVersion('2026.01'),
} satisfies ChallengeSource;

class MemoryStorage implements ProgressStorageAdapter {
	private value: string | null = null;

	async getItem(): Promise<string | null> {
		return this.value;
	}

	async setItem(_key: string, value: string): Promise<void> {
		this.value = value;
	}
}

describe('caccia daily challenge adapter', () => {
	it('replays a canonical grid and placed-word list identically without Math.random', () => {
		const randomSpy = vi.spyOn(Math, 'random');

		const first = createDailyChallengeGame(canonicalPayload);
		const second = createDailyChallengeGame(canonicalPayload);

		expect(first).toEqual(second);
		expect(first.grid.map((row) => row.map((cell) => cell.letter))).toEqual(canonicalPayload.grid);
		expect(first.grid[0]?.[0]).toEqual({ letter: 'P', row: 0, col: 0, placed: true });
		expect(first.words).toEqual(canonicalPayload.words);
		expect(randomSpy).not.toHaveBeenCalled();
		randomSpy.mockRestore();
	});

	it('rejects malformed duplicate normalized words', () => {
		const duplicatePayload = {
			...canonicalPayload,
			words: [canonicalPayload.words[0], { ...canonicalPayload.words[0], word: 'Pà ne' }],
		} satisfies WordSearchDailyChallengePayload;

		expect(() => createDailyChallengeGame(duplicatePayload)).toThrow(WordSearchChallengeValidationError);
	});

	it('persists give-up as a non-win terminal reason through official context', async () => {
		const store = new DailyProgressStore(new MemoryStorage());
		const queue = new DailyProgressMutationQueue(store);

		const result = await recordWordSearchGiveUp({ context: terminalContext, source, completedAt: new Date('2026-01-26T12:00:00.000Z') }, queue);
		const loaded = await store.load();

		expect(result.ok).toBe(true);
		expect(loaded).toMatchObject({
			ok: true,
			value: {
				kind: 'ready',
				progress: {
					challenges: [
						{
							challengeId: terminalContext.challengeId,
							source,
							officialAttempt: {
								attemptId: terminalContext.attemptId,
								terminalEvents: [
									{
										attemptId: terminalContext.attemptId,
										completedAt: '2026-01-26T12:00:00.000Z',
										puzzleKey: 'caccia',
										reason: 'giveUp',
										terminalEventId: terminalContext.terminalEventId,
									},
								],
							},
						},
					],
				},
			},
		});
	});

	it('derives a serializable completion summary from found words and score', () => {
		const initial = createDailyChallengeGame(canonicalPayload);
		const withPane = markWordFound(initial, 'PANE');
		const won = markWordFound(withPane, 'PERA');

		const summary = summarizeWordSearchChallenge(won, 'win');

		expect(summary).toEqual({ puzzleKey: 'caccia', reason: 'win', category: 'Mercato', difficulty: 'easy', score: 80, foundWords: ['PANE', 'PERA'], completedUnits: 2, totalUnits: 2 });
		expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
	});

	it('preserves standalone random game creation outside challenge mode', () => {
		const game = createGame('animali', 'easy');

		expect(game?.category).toBe('animali');
		expect(game?.difficulty).toBe('easy');
		expect(game?.grid.length).toBeGreaterThan(0);
		expect(game?.words.length).toBeGreaterThan(0);
	});
});
