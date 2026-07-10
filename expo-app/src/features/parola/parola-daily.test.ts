import { describe, expect, it } from 'vitest';

import { makeChallengeId } from '@/features/daily/date';
import { DailyProgressMutationQueue, createDailyProgressStore } from '@/features/daily/progress';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type DailyPuzzleKey } from '@/features/daily/types';

import { buildShareText } from './parola-logic';
import {
	ParolaDailyAttemptKindError,
	createParolaChallengeState,
	migrateLegacyParolaState,
	recordOfficialParolaChallengeTerminal,
	recordParolaChallengeTerminal,
} from './parola-daily';

class MemoryStorage {
	readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}

const challengeId = makeChallengeId('2026-07-09');

function queueFor(storage: MemoryStorage): DailyProgressMutationQueue {
	return new DailyProgressMutationQueue(createDailyProgressStore(storage));
}

function officialContext(input: { readonly challengeId: ChallengeId; readonly puzzleKey?: DailyPuzzleKey; readonly eventId: string }) {
	return {
		challengeId: input.challengeId,
		puzzleKey: input.puzzleKey ?? 'parola',
		attemptKind: 'official',
		attemptId: 'official-1',
		terminalEventId: input.eventId,
	} as const;
}

async function expectReadyProgress(storage: MemoryStorage) {
	const loaded = await createDailyProgressStore(storage).load();
	expect(loaded.ok).toBe(true);
	if (!loaded.ok || loaded.value.kind !== 'ready') throw new Error('expected ready daily progress');
	return loaded.value.progress;
}

describe('Paròle Daily Challenge source', () => {
	it('creates the Paròle target from the bundled catalog for a supplied local-civil challenge ID', () => {
		const first = createParolaChallengeState({ challengeId });
		const second = createParolaChallengeState({ challengeId, today: new Date('2026-07-08T23:30:00.000Z') });

		expect(first.state.targetWord).toBe('PASTA');
		expect(first.state.targetWordData).toMatchObject({ word: 'PASTA' });
		expect(first.state.date).toBe('2026-07-09');
		expect(second).toEqual(first);
	});

	it('keeps UTC rollover from changing challenge-mode content when challengeId is supplied', () => {
		const beforeUtcMidnight = createParolaChallengeState({ challengeId, today: new Date('2026-07-09T23:59:00.000Z') });
		const afterUtcMidnight = createParolaChallengeState({ challengeId, today: new Date('2026-07-10T00:01:00.000Z') });

		expect(beforeUtcMidnight.state.targetWord).toBe('PASTA');
		expect(afterUtcMidnight.state.targetWord).toBe('PASTA');
	});
});

describe('Paròle Daily Challenge terminal persistence', () => {
	it('persists giveUp as an official terminal reason without creating win credit for a single puzzle', async () => {
		const storage = new MemoryStorage();
		const challenge = createParolaChallengeState({ challengeId });

		const result = await recordParolaChallengeTerminal({
			queue: queueFor(storage),
			reason: 'giveUp',
			context: officialContext({ challengeId, eventId: 'parola-give-up' }),
			completedAt: new Date('2026-07-09T12:00:00'),
			source: challenge.bundle.source,
		});

		expect(result.ok).toBe(true);
		const progress = await expectReadyProgress(storage);
		expect(progress.credits).toEqual([]);
		expect(progress.challenges[0]?.officialAttempt?.terminalEvents[0]).toMatchObject({ puzzleKey: 'parola', reason: 'giveUp' });
	});

	it('lets giveUp unlock full-challenge completion while retaining a non-win Paròle result', async () => {
		const storage = new MemoryStorage();
		const queue = queueFor(storage);
		const challenge = createParolaChallengeState({ challengeId });

		for (const puzzleKey of CANONICAL_PUZZLE_KEYS) {
			const context = officialContext({ challengeId, puzzleKey, eventId: `terminal-${puzzleKey}` });
			if (puzzleKey === 'parola') {
				await recordParolaChallengeTerminal({
					queue,
					reason: 'giveUp',
					context,
					completedAt: new Date('2026-07-09T12:00:00'),
					source: challenge.bundle.source,
				});
			} else {
				await queue.recordPuzzleTerminal({ ...context, reason: 'win', completedAt: new Date('2026-07-09T12:00:00'), source: challenge.bundle.source });
			}
		}

		const progress = await expectReadyProgress(storage);
		expect(progress.statsSummary.completedOfficialChallenges).toBe(1);
		expect(progress.challenges[0]?.officialAttempt?.terminalEvents.find((event) => event.puzzleKey === 'parola')?.reason).toBe('giveUp');
	});

	it('rejects replay context when saving an official Paròle terminal event', async () => {
		const storage = new MemoryStorage();
		const challenge = createParolaChallengeState({ challengeId });

		expect(() =>
			recordOfficialParolaChallengeTerminal({
				queue: queueFor(storage),
				reason: 'giveUp',
				context: { ...officialContext({ challengeId, eventId: 'replay-as-official' }), attemptKind: 'replay', attemptId: 'replay-1' },
				completedAt: new Date('2026-07-09T12:00:00'),
				source: challenge.bundle.source,
			}),
		).toThrow(ParolaDailyAttemptKindError);
	});
});

describe('Paròle legacy progress migration', () => {
	it('migrates legacy wordleGameState only when date and target match the bundled challenge', async () => {
		const storage = new MemoryStorage();
		storage.values.set(
			'wordleGameState',
			JSON.stringify({ targetWord: 'PASTA', targetWordData: { word: 'PASTA' }, guesses: [{ word: 'PASTA' }], currentGuess: '', gameState: 'won', date: '2026-07-09' }),
		);

		const result = await migrateLegacyParolaState({
			storage,
			queue: queueFor(storage),
			challengeId,
			attemptId: 'legacy-official',
			terminalEventId: 'legacy-terminal',
			completedAt: new Date('2026-07-09T12:00:00'),
		});

		expect(result).toEqual({ kind: 'migrated' });
		const progress = await expectReadyProgress(storage);
		expect(progress.challenges[0]).toMatchObject({ migrationStatus: 'migrated' });
		expect(progress.challenges[0]?.officialAttempt?.terminalEvents[0]).toMatchObject({ attemptId: 'legacy-official', reason: 'win' });
		expect(storage.values.get('wordleGameState')).toContain('PASTA');
	});

	it('ignores stale or mismatched legacy saves without overwriting challenge records', async () => {
		const storage = new MemoryStorage();
		const challenge = createParolaChallengeState({ challengeId });
		await recordParolaChallengeTerminal({
			queue: queueFor(storage),
			reason: 'loss',
			context: officialContext({ challengeId, eventId: 'existing-official' }),
			completedAt: new Date('2026-07-09T12:00:00'),
			source: challenge.bundle.source,
		});
		const before = storage.values.get('daily-progress:v1');
		storage.values.set(
			'wordleGameState',
			JSON.stringify({ targetWord: 'CANTO', targetWordData: { word: 'CANTO' }, guesses: [{ word: 'CANTO' }], currentGuess: '', gameState: 'won', date: '2026-07-09' }),
		);

		const result = await migrateLegacyParolaState({
			storage,
			queue: queueFor(storage),
			challengeId,
			attemptId: 'legacy-official',
			terminalEventId: 'legacy-terminal',
			completedAt: new Date('2026-07-09T12:00:00'),
		});

		expect(result).toEqual({ kind: 'ignored', reason: 'mismatch' });
		expect(storage.values.get('daily-progress:v1')).toBe(before);
		expect(storage.values.get('wordleGameState')).toContain('CANTO');
	});
});

describe('Paròle Daily Challenge share safety', () => {
	it('does not expose the challenge target and never renders giveUp as a win result', () => {
		const { state } = createParolaChallengeState({ challengeId });
		const share = buildShareText({ ...state, gameState: 'lost', guesses: [] });

		expect(share).not.toContain('PASTA');
		expect(share).toContain('X/6');
		expect(share).not.toContain('1/6');
	});
});
