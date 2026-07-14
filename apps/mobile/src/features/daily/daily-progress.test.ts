import { describe, expect, it } from 'vitest';

import { CATALOG_METADATA, resolveDailyChallengeBundle } from './catalog';
import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId, makeStreakDate } from './date';
import { DailyProgressMutationQueue, createDailyProgressStore, loadDailyProgressArchiveState } from './progress';
import { DAILY_PROGRESS_KEY, DAILY_PROGRESS_QUARANTINE_KEY, DAILY_PROGRESS_SCHEMA_VERSION, makeProgressReady } from './progress-model';
import type { ChallengeId, DailyPuzzleKey, TerminalReason } from './types';

class MemoryProgressStorage {
	readonly values = new Map<string, string>();
	readonly reads: string[] = [];
	readonly writes: string[] = [];
	readonly operations: { readonly kind: 'get' | 'set'; readonly key: string }[] = [];
	failNextRead = false;
	failNextWrite = false;

	async getItem(key: string): Promise<string | null> {
		this.reads.push(key);
		this.operations.push({ kind: 'get', key });
		if (this.failNextRead) {
			this.failNextRead = false;
			throw new Error('read failed');
		}
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.writes.push(value);
		this.operations.push({ kind: 'set', key });
		if (this.failNextWrite) {
			this.failNextWrite = false;
			throw new Error('write failed');
		}
		this.values.set(key, value);
	}
}

const DAILY_PROGRESS_V1_KEY = 'daily-progress:v1';

function readyBundle(challengeId: ChallengeId) {
	const resolution = resolveDailyChallengeBundle({ challengeId });
	expect(resolution.kind).toBe('ready');
	if (resolution.kind !== 'ready') throw new Error('expected ready bundle');
	return resolution.bundle;
}

function parseQuarantineEnvelope(raw: string | undefined): Record<string, unknown> {
	expect(raw).toBeDefined();
	if (raw === undefined) throw new Error('expected quarantine envelope');
	const parsed: unknown = JSON.parse(raw);
	expect(isRecord(parsed)).toBe(true);
	if (!isRecord(parsed)) throw new Error('expected quarantine object');
	return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
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
		const officialBytes = storage.values.get(DAILY_PROGRESS_KEY);
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
		expect(storage.values.get(DAILY_PROGRESS_KEY)).toContain('replay-event-1');
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
	it('migrates safely recoverable v1 progress with a derived bundled release base', async () => {
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-01-26');
		const invalidReleaseBaseChallengeId = makeChallengeId('2026-02-14');
		const bundle = readyBundle(challengeId);
		const invalidReleaseBaseBundle = readyBundle(invalidReleaseBaseChallengeId);
		const legacyBundleSnapshot = {
			challengeId: bundle.challengeId,
			streakDate: bundle.streakDate,
			source: bundle.source,
			catalogEpoch: bundle.catalogEpoch,
			catalogVersion: bundle.catalogVersion,
			supportedFromChallengeId: bundle.supportedFromChallengeId,
			supportedThroughChallengeId: bundle.supportedThroughChallengeId,
			theme: bundle.theme,
			puzzles: bundle.puzzles,
		};
		const invalidReleaseBaseBundleSnapshot = { ...invalidReleaseBaseBundle, releaseBaseChallengeId: '2026-02-31' };
		const legacy = {
			schemaVersion: 1,
			challenges: [
				{
					challengeId,
					source: bundle.source,
					bundleSnapshot: legacyBundleSnapshot,
					migrationStatus: 'fresh',
					officialAttempt: {
						attemptId: 'official-1',
						terminalEvents: [
							{ attemptId: 'official-1', completedAt: '2026-01-26T12:00:00.000Z', puzzleKey: 'parola', reason: 'win', terminalEventId: 'terminal-1' },
						],
					},
					inProgressPuzzles: [{ puzzleKey: 'caccia', state: { letters: ['A'] }, updatedAt: '2026-01-26T12:01:00.000Z' }],
					replayAttempts: [{ attemptId: 'replay-1', terminalEvents: [{ attemptId: 'replay-1', completedAt: '2026-01-26T12:02:00.000Z', puzzleKey: 'parola', reason: 'loss', terminalEventId: 'replay-terminal-1' }] }],
					themeQuizResult: { answerIndex: 2, answeredAt: '2026-01-26T12:03:00.000Z', eventId: 'theme-1' },
				},
				{
					challengeId: invalidReleaseBaseChallengeId,
					source: invalidReleaseBaseBundle.source,
					bundleSnapshot: invalidReleaseBaseBundleSnapshot,
					migrationStatus: 'fresh',
					inProgressPuzzles: [],
					replayAttempts: [],
				},
			],
			credits: [{ challengeId, completedAt: '2026-01-26T12:04:00.000Z', creditId: 'credit:2026-01-26', streakDate: makeStreakDate('2026-01-26') }],
			mutationEventIds: ['terminal-1', 'replay-terminal-1', 'theme-1'],
		};
		storage.values.set(DAILY_PROGRESS_V1_KEY, JSON.stringify(legacy));

		const state = await expectOk(createDailyProgressStore(storage).load());

		expect(state.kind).toBe('ready');
		if (state.kind !== 'ready') throw new Error('expected ready migrated progress');
		expect(state.progress.schemaVersion).toBe(DAILY_PROGRESS_SCHEMA_VERSION);
		expect(state.progress.challenges[0]?.migrationStatus).toBe('migrated');
		expect(state.progress.challenges[0]?.bundleSnapshot?.releaseBaseChallengeId).toBe(CATALOG_METADATA.releaseBaseChallengeId);
		expect(state.progress.challenges[1]?.bundleSnapshot?.releaseBaseChallengeId).toBe(CATALOG_METADATA.releaseBaseChallengeId);
		expect(state.progress.challenges[0]?.officialAttempt?.terminalEvents.map((event) => event.terminalEventId)).toEqual(['terminal-1']);
		expect(state.progress.challenges[0]?.inProgressPuzzles).toHaveLength(1);
		expect(state.progress.challenges[0]?.replayAttempts[0]?.terminalEvents.map((event) => event.terminalEventId)).toEqual(['replay-terminal-1']);
		expect(state.progress.credits.map((credit) => credit.creditId)).toEqual(['credit:2026-01-26']);
		expect(state.progress.mutationEventIds).toEqual(['replay-terminal-1', 'terminal-1', 'theme-1']);
		expect(storage.values.get(DAILY_PROGRESS_V1_KEY)).toBe(JSON.stringify(legacy));
		expect(storage.values.get(DAILY_PROGRESS_KEY)).toContain('"schemaVersion":2');
	});

	it('quarantines unrecoverable v1 progress before writing verified empty v2 progress', async () => {
		const storage = new MemoryProgressStorage();
		const raw = '{broken';
		storage.values.set(DAILY_PROGRESS_V1_KEY, raw);

		const result = await createDailyProgressStore(storage).load();

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('expected recovery result');
		expect(result.value.kind).toBe('ready');
		if (result.value.kind !== 'ready') throw new Error('expected recovered progress');
		expect(result.value.progress).toEqual(makeProgressReady({ schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION, challenges: [], credits: [], mutationEventIds: [] }));
		expect(storage.values.get(DAILY_PROGRESS_V1_KEY)).toBe(raw);
		const envelope = parseQuarantineEnvelope(storage.values.get(DAILY_PROGRESS_QUARANTINE_KEY));
		expect(envelope.sourceKey).toBe(DAILY_PROGRESS_V1_KEY);
		expect(envelope.reason).toBe('invalidJson');
		expect(envelope.raw).toBe(raw);
		expect(storage.operations.map((operation) => `${operation.kind}:${operation.key}`)).toEqual([
			`get:${DAILY_PROGRESS_KEY}`,
			`get:${DAILY_PROGRESS_V1_KEY}`,
			`set:${DAILY_PROGRESS_QUARANTINE_KEY}`,
			`get:${DAILY_PROGRESS_QUARANTINE_KEY}`,
			`set:${DAILY_PROGRESS_KEY}`,
			`get:${DAILY_PROGRESS_KEY}`,
		]);
	});

	it('recovers unrecoverable v1 progress before accepting queued mutations', async () => {
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-01-26');
		const bundle = readyBundle(challengeId);
		const mismatchedBundle = { ...bundle, releaseBaseChallengeId: '2026-02-31', catalogVersion: 'legacy-mismatch' };
		storage.values.set(
			DAILY_PROGRESS_V1_KEY,
			JSON.stringify({
				schemaVersion: 1,
				challenges: [{ challengeId, source: bundle.source, bundleSnapshot: mismatchedBundle, migrationStatus: 'fresh', inProgressPuzzles: [], replayAttempts: [] }],
				credits: [],
				mutationEventIds: [],
			}),
		);
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));

		const result = await queue.recordPuzzleTerminal(terminalInput({ challengeId, terminalEventId: 'post-recovery-terminal' }));

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('expected recovered mutation');
		expect(result.value.schemaVersion).toBe(DAILY_PROGRESS_SCHEMA_VERSION);
		expect(result.value.challenges[0]?.officialAttempt?.terminalEvents.map((event) => event.terminalEventId)).toEqual(['post-recovery-terminal']);
		expect(storage.values.get(DAILY_PROGRESS_V1_KEY)).toContain('2026-02-31');
		expect(storage.values.get(DAILY_PROGRESS_QUARANTINE_KEY)).toContain('2026-02-31');
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
