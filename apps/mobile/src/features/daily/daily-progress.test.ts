import { describe, expect, it } from 'vitest';

import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId, makeStreakDate } from './date';
import { DailyProgressMutationQueue, createDailyProgressStore, loadDailyProgressArchiveState } from './progress';
import type { ChallengeId, DailyPuzzleKey, TerminalReason } from './types';

class MemoryProgressStorage {
	readonly values = new Map<string, string>();
	readonly reads: string[] = [];
	readonly writes: string[] = [];
	failNextRead = false;
	failNextWrite = false;

	async getItem(key: string): Promise<string | null> {
		this.reads.push(key);
		if (this.failNextRead) {
			this.failNextRead = false;
			throw new Error('read failed');
		}
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.writes.push(value);
		if (this.failNextWrite) {
			this.failNextWrite = false;
			throw new Error('write failed');
		}
		this.values.set(key, value);
	}
}

const source = {
	kind: 'bundledCatalog',
	epoch: makeCatalogEpoch('daily-v1'),
	version: makeCatalogVersion('2026.01'),
} as const;

function terminalInput(input: {
	readonly challengeId: ChallengeId;
	readonly puzzleKey?: DailyPuzzleKey;
	readonly terminalEventId: string;
	readonly attemptKind?: 'official' | 'replay';
	readonly attemptId?: string;
	readonly reason?: TerminalReason;
	readonly completedAt?: Date;
}) {
	return {
		challengeId: input.challengeId,
		puzzleKey: input.puzzleKey ?? 'parola',
		attemptKind: input.attemptKind ?? 'official',
		attemptId: input.attemptId ?? 'official-1',
		terminalEventId: input.terminalEventId,
		reason: input.reason ?? 'win',
		completedAt: input.completedAt ?? new Date(`${input.challengeId}T12:00:00Z`),
		source,
	};
}

async function expectOk<T>(result: Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }>): Promise<T> {
	const settled = await result;
	expect(settled.ok).toBe(true);
	if (!settled.ok) throw new Error('expected ok result');
	return settled.value;
}

describe('daily-progress official persistence', () => {
	it('keeps the first official completion immutable when replay writes arrive later', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const challengeId = makeChallengeId('2026-01-26');

		await expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId, terminalEventId: 'official-event-1' })));
		const officialBytes = storage.values.get('daily-progress:v1');
		await expectOk(
			queue.recordPuzzleTerminal(
				terminalInput({
					challengeId,
					attemptKind: 'replay',
					attemptId: 'replay-1',
					terminalEventId: 'replay-event-1',
					reason: 'loss',
				}),
			),
		);

		const state = await expectOk(createDailyProgressStore(storage).load());
		const record = state.kind === 'ready' ? state.progress.challenges[0] : undefined;
		expect(record?.officialAttempt?.terminalEvents).toEqual([
			{
				attemptId: 'official-1',
				completedAt: '2026-01-26T12:00:00.000Z',
				puzzleKey: 'parola',
				reason: 'win',
				terminalEventId: 'official-event-1',
			},
		]);
		expect(record?.replayAttempts).toHaveLength(1);
		expect(officialBytes).toContain('official-event-1');
		expect(storage.values.get('daily-progress:v1')).toContain('replay-event-1');
	});

	it('serializes same-day and adjacent-day official completions through one global queue', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const firstDay = makeChallengeId('2026-01-26');
		const secondDay = makeChallengeId('2026-01-27');

		await Promise.all([
			expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId: firstDay, terminalEventId: 'same-day-a' }))),
			expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId: firstDay, terminalEventId: 'same-day-b', puzzleKey: 'caccia' }))),
			expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId: secondDay, terminalEventId: 'next-day-a' }))),
		]);

		const state = await expectOk(createDailyProgressStore(storage).load());
		const progress = state.kind === 'ready' ? state.progress : undefined;
		expect(progress?.challenges.map((record) => record.challengeId)).toEqual(['2026-01-26', '2026-01-27']);
		expect(progress?.challenges[0]?.officialAttempt?.terminalEvents.map((event) => event.terminalEventId)).toEqual([
			'same-day-a',
			'same-day-b',
		]);
		expect(progress?.statsSummary.totalOfficialTerminalEvents).toBe(3);
	});

	it('deduplicates terminal events and completion credits by event id', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const challengeId = makeChallengeId('2026-01-26');
		const puzzles: readonly DailyPuzzleKey[] = ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'];

		for (const puzzleKey of puzzles) {
			await expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId, puzzleKey, terminalEventId: `event-${puzzleKey}` })));
		}
		await expectOk(queue.recordPuzzleTerminal(terminalInput({ challengeId, puzzleKey: 'parola', terminalEventId: 'event-parola' })));

		const state = await expectOk(createDailyProgressStore(storage).load());
		const progress = state.kind === 'ready' ? state.progress : undefined;
		expect(progress?.credits).toEqual([
			{ challengeId, completedAt: '2026-01-26T12:00:00.000Z', creditId: 'credit:2026-01-26', streakDate: makeStreakDate('2026-01-26') },
		]);
		expect(progress?.statsSummary.currentStreak).toBe(1);
		expect(progress?.statsSummary.totalOfficialTerminalEvents).toBe(5);
	});

	it('keeps prior-day completion archived without streak credit', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const challengeId = makeChallengeId('2026-01-26');
		const puzzles: readonly DailyPuzzleKey[] = ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'];

		for (const puzzleKey of puzzles) {
			await expectOk(
				queue.recordPuzzleTerminal(
					terminalInput({ challengeId, puzzleKey, terminalEventId: `late-${puzzleKey}`, completedAt: new Date('2026-01-27T00:02:00') }),
				),
			);
		}

		const state = await expectOk(createDailyProgressStore(storage).load());
		const progress = state.kind === 'ready' ? state.progress : undefined;
		expect(progress?.credits).toEqual([]);
		expect(progress?.statsSummary.completedOfficialChallenges).toBe(1);
		expect(progress?.statsSummary.currentStreak).toBe(0);
	});

	it('persists in-progress, theme quiz, replay-only, missed, and completed archive distinctions', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const store = createDailyProgressStore(storage);
		const today = makeChallengeId('2026-01-26');
		const replayOnly = makeChallengeId('2026-01-24');

		await expectOk(queue.savePuzzleProgress({ challengeId: today, puzzleKey: 'parola', state: { letters: ['A'] }, source }));
		await expectOk(queue.recordThemeQuizResult({ challengeId: today, eventId: 'theme-1', answerIndex: 2, answeredAt: new Date('2026-01-26T13:00:00Z') }));
		await expectOk(
			queue.recordPuzzleTerminal(terminalInput({ challengeId: replayOnly, attemptKind: 'replay', attemptId: 'replay-only-1', terminalEventId: 'replay-only-event' })),
		);

		expect(await loadDailyProgressArchiveState(store, makeChallengeId('2026-01-23'))).toEqual({ kind: 'missed', challengeId: '2026-01-23' });
		expect(await loadDailyProgressArchiveState(store, today)).toEqual({ kind: 'inProgress', challengeId: today });
		expect(await loadDailyProgressArchiveState(store, replayOnly)).toEqual({ kind: 'replayOnly', challengeId: replayOnly, replayCount: 1 });
	});
});

describe('daily-progress recovery', () => {
	it('quarantines corrupt official bytes without deleting the original payload', async () => {
		const storage = new MemoryProgressStorage();
		storage.values.set('daily-progress:v1', '{broken');

		const result = await createDailyProgressStore(storage).load();

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('expected quarantine result');
		expect(result.value).toEqual({ kind: 'quarantined', message: 'Daily Challenge progress needs recovery.' });
		expect(storage.values.get('daily-progress:v1:quarantine')).toBe('{broken');
		expect(storage.values.get('daily-progress:v1')).toBe('{broken');
	});

	it('surfaces AsyncStorage read and write failures as recoverable errors', async () => {
		const storage = new MemoryProgressStorage();
		const store = createDailyProgressStore(storage);
		storage.failNextRead = true;

		const readFailure = await store.load();
		expect(readFailure).toEqual({ ok: false, error: { kind: 'readFailed', message: 'Unable to read Daily Challenge progress.' } });

		storage.failNextWrite = true;
		const writeFailure = await new DailyProgressMutationQueue(store).recordPuzzleTerminal(
			terminalInput({ challengeId: makeChallengeId('2026-01-26'), terminalEventId: 'write-fails' }),
		);
		expect(writeFailure).toEqual({ ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } });
	});
});
