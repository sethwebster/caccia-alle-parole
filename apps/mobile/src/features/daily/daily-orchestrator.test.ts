import { Observe } from 'expo-observe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeChallengeId } from './date';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import type { DailyChallengeReadySnapshot } from './orchestrator-model';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { DAILY_PROGRESS_KEY, DAILY_PROGRESS_QUARANTINE_KEY } from './progress-model';
import type { DailyPuzzleKey, TerminalReason } from './types';

vi.mock('expo-observe', () => ({ Observe: { logEvent: vi.fn() } }));

class MemoryProgressStorage {
	readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}

const DAILY_PROGRESS_V1_KEY = 'daily-progress:v1';

type Deferred<T> = {
	readonly promise: Promise<T>;
	readonly resolve: (value: T) => void;
};

class ControlledProgressStorage extends MemoryProgressStorage {
	private readonly pendingGetItems: Deferred<string | null>[] = [];

	pauseNextGetItem(): Deferred<string | null> {
		let resolveDeferred: ((value: string | null) => void) | undefined;
		const promise = new Promise<string | null>((resolve) => {
			resolveDeferred = resolve;
		});
		const deferred = {
			promise,
			resolve: (value: string | null) => {
				if (resolveDeferred === undefined) throw new Error('Deferred getItem resolver was not initialized.');
				resolveDeferred(value);
			},
		};
		this.pendingGetItems.push(deferred);
		return deferred;
	}

	override async getItem(key: string): Promise<string | null> {
		const pending = this.pendingGetItems.shift();
		if (pending !== undefined) return pending.promise;
		return super.getItem(key);
	}
}

async function settleAsyncWork(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

beforeEach(() => {
	vi.mocked(Observe.logEvent).mockClear();
});

function makeOrchestrator(storage = new MemoryProgressStorage()): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(storage);
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function expectLoaded(orchestrator: DailyChallengeOrchestrator, date = '2026-07-09') {
	const loaded = await orchestrator.loadOfficial({ challengeId: makeChallengeId(date), now: new Date(`${date}T10:00:00`) });
	expect(loaded.kind).toBe('ready');
	if (loaded.kind !== 'ready') throw new Error('expected ready daily challenge');
	return loaded;
}

function expectReady(orchestrator: DailyChallengeOrchestrator): DailyChallengeReadySnapshot {
	const snapshot = orchestrator.getSnapshot();
	expect(snapshot.kind).toBe('ready');
	if (snapshot.kind !== 'ready') throw new Error('expected ready daily challenge');
	return snapshot;
}

async function finishPuzzle(orchestrator: DailyChallengeOrchestrator, puzzleKey: DailyPuzzleKey, reason: TerminalReason, date = '2026-07-09') {
	const attempt = await orchestrator.startPuzzle({ puzzleKey });
	const recorded = await orchestrator.recordTerminal({ context: attempt.context, reason, completedAt: new Date(`${date}T18:00:00`) });
	expect(recorded.kind).toBe('accepted');
	return recorded;
}

describe('daily challenge orchestrator official state machine', () => {
	it('moves from notStarted to inProgress to completedOfficial', async () => {
		// Given: today's challenge has no saved official progress.
		const orchestrator = makeOrchestrator();
		const initial = await expectLoaded(orchestrator);

		// When: the player starts and then completes every puzzle.
		expect(initial.phase).toBe('notStarted');
		await orchestrator.startPuzzle({ puzzleKey: 'parola' });
		expect(expectReady(orchestrator).phase).toBe('inProgress');
		for (const puzzleKey of ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const) {
			if (puzzleKey !== 'parola') await orchestrator.startPuzzle({ puzzleKey });
			await orchestrator.recordTerminal({ context: expectReady(orchestrator).activeAttempt?.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });
		}

		// Then: the official challenge is complete and the theme gate is unlocked.
		const final = expectReady(orchestrator);
		expect(final.phase).toBe('completedOfficial');
		expect(final.themeGate).toBe('unlocked');
		expect(final.puzzles.every((puzzle) => puzzle.status.kind === 'terminal')).toBe(true);
	});

	it('completes official challenge with mixed win loss skip and giveUp terminal paths', async () => {
		// Given: an official challenge is ready.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		const terminalPlan = [
			['parola', 'win'],
			['caccia', 'loss'],
			['paroliere', 'skip'],
			['impiccato', 'giveUp'],
			['anagrammi', 'win'],
		] as const;

		// When: each puzzle ends through a different terminal path.
		for (const [puzzleKey, reason] of terminalPlan) await finishPuzzle(orchestrator, puzzleKey, reason);

		// Then: all five outcomes count as terminal and unlock the theme gate.
		const snapshot = expectReady(orchestrator);
		expect(snapshot.phase).toBe('completedOfficial');
		expect(snapshot.themeGate).toBe('unlocked');
		expect(snapshot.progress.statsSummary.completedOfficialChallenges).toBe(1);
		expect(snapshot.progress.statsSummary.currentStreak).toBe(1);
	});

	it('logs start end and completion transitions from accepted official events', async () => {
		// Given: an official challenge is ready.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);

		// When: the player starts one puzzle and completes the challenge.
		await finishPuzzle(orchestrator, 'parola', 'win');
		for (const puzzleKey of ['caccia', 'paroliere', 'impiccato', 'anagrammi'] as const) await finishPuzzle(orchestrator, puzzleKey, 'win');

		// Then: analytics are emitted by the orchestrator boundary, not the route.
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.started', { attributes: { challengeId: makeChallengeId('2026-07-09'), puzzleKey: 'parola' } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.puzzle_ended', { attributes: { challengeId: makeChallengeId('2026-07-09'), puzzleKey: 'parola', mode: 'official', reason: 'win' } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.completed', { attributes: { challengeId: makeChallengeId('2026-07-09'), wins: 5, streak: 1 } });
	});

	it('exposes next current and give-up actions for official play', async () => {
		// Given: an official challenge is ready and no puzzle has started.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);

		// When: the player starts the current puzzle, gives it up, then starts the next one.
		const currentAttempt = await orchestrator.startCurrentPuzzle();
		const giveUp = await orchestrator.giveUpActive({ completedAt: new Date('2026-07-09T18:00:00') });
		const nextAttempt = await orchestrator.startNextPuzzle();

		// Then: give-up is terminal and the next action advances to the next unstarted puzzle.
		expect(currentAttempt.context.puzzleKey).toBe('parola');
		expect(giveUp.kind).toBe('accepted');
		expect(nextAttempt.context.puzzleKey).toBe('caccia');
		expect(expectReady(orchestrator).record?.officialAttempt?.terminalEvents[0]?.reason).toBe('giveUp');
	});

	it('keeps the theme quiz locked at four terminal results', async () => {
		// Given: four official puzzles have ended.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		for (const puzzleKey of ['parola', 'caccia', 'paroliere', 'impiccato'] as const) await finishPuzzle(orchestrator, puzzleKey, 'win');

		// When: the fifth puzzle has not reached a terminal state.
		const snapshot = expectReady(orchestrator);

		// Then: the challenge remains in progress and the theme gate is locked.
		expect(snapshot.phase).toBe('inProgress');
		expect(snapshot.themeGate).toBe('locked');
	});

	it('ignores duplicate terminal events without double crediting completion', async () => {
		// Given: one active official attempt context.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		const attempt = await orchestrator.startPuzzle({ puzzleKey: 'parola' });

		// When: the same terminal callback arrives twice.
		const first = await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });
		const second = await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });

		// Then: only the first callback is accepted by the active state machine.
		expect(first.kind).toBe('accepted');
		expect(second).toEqual({ kind: 'rejected', reason: 'attemptNotActive' });
		expect(expectReady(orchestrator).progress.statsSummary.totalOfficialTerminalEvents).toBe(1);
	});

	it('credits release-day full completion exactly once after duplicate terminal callbacks', async () => {
		// Given: four official puzzles have already ended on their release day.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		for (const puzzleKey of ['parola', 'caccia', 'paroliere', 'impiccato'] as const) await finishPuzzle(orchestrator, puzzleKey, 'win');
		const finalAttempt = await orchestrator.startPuzzle({ puzzleKey: 'anagrammi' });

		// When: the final terminal callback is delivered twice.
		const first = await orchestrator.recordTerminal({ context: finalAttempt.context, reason: 'skip', completedAt: new Date('2026-07-09T18:00:00') });
		const second = await orchestrator.recordTerminal({ context: finalAttempt.context, reason: 'skip', completedAt: new Date('2026-07-09T18:00:00') });

		// Then: the challenge is completed and the streak credit is immutable by challenge id.
		expect(first.kind).toBe('accepted');
		expect(second).toEqual({ kind: 'rejected', reason: 'attemptNotActive' });
		expect(expectReady(orchestrator).progress.credits).toHaveLength(1);
		expect(expectReady(orchestrator).progress.statsSummary.currentStreak).toBe(1);
	});
});

describe('daily challenge orchestrator replay and resume safety', () => {
	it('ignores an older official load that resolves after a newer official load', async () => {
		// Given: the first load is still waiting on persisted progress.
		const storage = new ControlledProgressStorage();
		const orchestrator = makeOrchestrator(storage);
		const staleProgress = storage.pauseNextGetItem();
		const staleLoad = orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-08'), now: new Date('2026-07-08T10:00:00') });

		// When: a newer official load completes before the old one resolves.
		const freshLoad = await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
		staleProgress.resolve(null);
		await staleLoad;
		await settleAsyncWork();

		// Then: the stale load result cannot replace the current snapshot.
		const snapshot = expectReady(orchestrator);
		expect(freshLoad.kind).toBe('ready');
		expect(snapshot.bundle.challengeId).toBe(makeChallengeId('2026-07-09'));
	});

	it('ignores an older replay load that resolves after a newer official load', async () => {
		// Given: an archived challenge exists and a replay load is waiting on persisted progress.
		const storage = new ControlledProgressStorage();
		const archiver = makeOrchestrator(storage);
		await expectLoaded(archiver, '2026-07-08');
		await finishPuzzle(archiver, 'parola', 'win', '2026-07-08');
		const orchestrator = makeOrchestrator(storage);
		const staleProgress = storage.pauseNextGetItem();
		const staleLoad = orchestrator.loadReplay({ challengeId: makeChallengeId('2026-07-08'), now: new Date('2026-07-09T10:00:00') });

		// When: a newer official load completes before the replay load resolves.
		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
		staleProgress.resolve(storage.values.get('daily-progress:v1') ?? null);
		await staleLoad;
		await settleAsyncWork();

		// Then: the stale replay cannot replace official mode or challenge id.
		const snapshot = expectReady(orchestrator);
		expect(snapshot.mode).toBe('official');
		expect(snapshot.bundle.challengeId).toBe(makeChallengeId('2026-07-09'));
	});

	it('ignores a pending load that resolves after an official mutation starts', async () => {
		// Given: an official challenge is ready and a second load is waiting on persisted progress.
		const storage = new ControlledProgressStorage();
		const orchestrator = makeOrchestrator(storage);
		await expectLoaded(orchestrator);
		const staleProgress = storage.pauseNextGetItem();
		const staleLoad = orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });

		// When: the player starts a puzzle before the pending load resolves.
		const activeAttempt = await orchestrator.startPuzzle({ puzzleKey: 'parola', now: new Date('2026-07-09T12:00:00') });
		staleProgress.resolve(null);
		await staleLoad;
		await settleAsyncWork();

		// Then: the stale load cannot erase the active attempt snapshot.
		expect(expectReady(orchestrator).activeAttempt?.context).toEqual(activeAttempt.context);
	});

	it('prevents replay terminal callbacks from mutating official progress', async () => {
		// Given: an official puzzle result already exists.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		await finishPuzzle(orchestrator, 'parola', 'win');

		// When: archive replay records a loss for the same puzzle.
		const replay = await orchestrator.startReplay({ puzzleKey: 'parola' });
		const replayResult = await orchestrator.recordTerminal({ context: replay.context, reason: 'loss', completedAt: new Date('2026-07-09T19:00:00') });

		// Then: replay is stored separately and the official result remains the first win.
		expect(replayResult.kind).toBe('accepted');
		const record = expectReady(orchestrator).record;
		expect(record?.officialAttempt?.terminalEvents).toHaveLength(1);
		expect(record?.officialAttempt?.terminalEvents[0]?.reason).toBe('win');
		expect(record?.replayAttempts[0]?.terminalEvents[0]?.reason).toBe('loss');
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.replay_started', { attributes: { challengeId: makeChallengeId('2026-07-09'), puzzleKey: 'parola' } });
	});

	it('rejects stale late callbacks whose attempt id no longer matches the active attempt', async () => {
		// Given: one official attempt was superseded by a new active attempt for another puzzle.
		const orchestrator = makeOrchestrator();
		await expectLoaded(orchestrator);
		const sameTick = new Date('2026-07-09T18:00:00');
		const stale = await orchestrator.startPuzzle({ puzzleKey: 'parola', now: sameTick });
		await orchestrator.startPuzzle({ puzzleKey: 'caccia', now: sameTick });

		// When: the stale timer callback reports the old attempt.
		const result = await orchestrator.recordTerminal({ context: stale.context, reason: 'loss', completedAt: new Date('2026-07-09T18:00:00') });

		// Then: no official terminal event is written.
		expect(result).toEqual({ kind: 'rejected', reason: 'attemptMismatch' });
		expect(expectReady(orchestrator).progress.statsSummary.totalOfficialTerminalEvents).toBe(0);
	});

	it('resumes an in-progress official challenge after app restart', async () => {
		// Given: a first orchestrator started a puzzle and persisted the active attempt.
		const storage = new MemoryProgressStorage();
		const first = makeOrchestrator(storage);
		await expectLoaded(first);
		const attempt = await first.startPuzzle({ puzzleKey: 'parola' });

		// When: a new orchestrator loads the same persisted progress.
		const restarted = makeOrchestrator(storage);
		const loaded = await expectLoaded(restarted);

		// Then: it resumes the same active attempt and can complete it.
		expect(loaded.phase).toBe('inProgress');
		expect(loaded.activeAttempt?.context).toEqual(attempt.context);
		const result = await restarted.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });
		expect(result.kind).toBe('accepted');
		expect(expectReady(restarted).record?.officialAttempt?.terminalEvents[0]?.puzzleKey).toBe('parola');
	});

	it('resumes the newest persisted official attempt after app restart without Array toSorted', async () => {
		// Given: multiple open official attempts were persisted before restart.
		const storage = new MemoryProgressStorage();
		const first = makeOrchestrator(storage);
		await expectLoaded(first);
		await first.startPuzzle({ puzzleKey: 'parola', now: new Date('2026-07-09T12:00:00') });
		await first.startPuzzle({ puzzleKey: 'caccia', now: new Date('2026-07-09T13:00:00') });
		const newestByOrder = await first.startPuzzle({ puzzleKey: 'paroliere', now: new Date('2026-07-09T13:00:00') });

		// When: Hermes lacks Array.prototype.toSorted and a new orchestrator loads persisted progress.
		const restarted = makeOrchestrator(storage);
		const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toSorted');
		Reflect.defineProperty(Array.prototype, 'toSorted', { configurable: true, writable: true, value: undefined });
		let loaded: DailyChallengeReadySnapshot;
		try {
			loaded = await expectLoaded(restarted);
		} finally {
			if (descriptor === undefined) {
				delete (Array.prototype as { toSorted?: unknown }).toSorted;
			} else {
				Reflect.defineProperty(Array.prototype, 'toSorted', descriptor);
			}
		}

		// Then: it resumes the newest open attempt, using persisted order as the tie-breaker.
		expect(loaded.phase).toBe('inProgress');
		expect(loaded.activeAttempt?.context).toEqual(newestByOrder.context);
	});

	it('loads ready and accepts mutations after quarantining unrecoverable legacy progress', async () => {
		// Given: legacy storage contains malformed Daily progress that cannot be migrated safely.
		const storage = new MemoryProgressStorage();
		storage.values.set(DAILY_PROGRESS_V1_KEY, JSON.stringify({ schemaVersion: 1, challenges: [{ challengeId: '2026-02-31' }], credits: [], mutationEventIds: [] }));
		const orchestrator = makeOrchestrator(storage);

		// When: Daily starts and the player records a puzzle result.
		const loaded = await expectLoaded(orchestrator);
		const attempt = await orchestrator.startPuzzle({ puzzleKey: 'parola' });
		const result = await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });

		// Then: startup did not surface a progress error, recovery preserved the raw legacy bytes, and the queue writes v2 progress.
		expect(loaded.progress.challenges).toEqual([]);
		expect(result.kind).toBe('accepted');
		expect(storage.values.get(DAILY_PROGRESS_V1_KEY)).toContain('2026-02-31');
		expect(storage.values.get(DAILY_PROGRESS_QUARANTINE_KEY)).toContain('2026-02-31');
		expect(storage.values.get(DAILY_PROGRESS_KEY)).toContain('terminal:2026-07-09:parola:official:1');
	});
});
