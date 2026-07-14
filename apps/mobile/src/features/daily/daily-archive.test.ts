import { describe, expect, it, vi } from 'vitest';
import { resolveDailyChallengeBundle, type DailyCatalogBundle } from './catalog';
import { makeChallengeId, makeStreakDate } from './date';
import { loadDailyArchiveModel } from './daily-archive-model';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { DAILY_PROGRESS_KEY, DAILY_PROGRESS_SCHEMA_VERSION, makeProgressReady } from './progress-model';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type DailyPuzzleKey, type TerminalReason } from './types';

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

function makeStore(storage: MemoryProgressStorage) {
	return createDailyProgressStore(storage);
}

function makeOrchestrator(storage: MemoryProgressStorage): DailyChallengeOrchestrator {
	const store = makeStore(storage);
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function loadReady(orchestrator: DailyChallengeOrchestrator, challengeId: ChallengeId) {
	const loaded = await orchestrator.loadOfficial({ challengeId, now: new Date(`${challengeId}T10:00:00`) });
	expect(loaded.kind).toBe('ready');
	if (loaded.kind !== 'ready') throw new Error('expected ready challenge');
	return loaded;
}

async function finishOfficial(orchestrator: DailyChallengeOrchestrator, challengeId: ChallengeId, reason: TerminalReason = 'win') {
	await loadReady(orchestrator, challengeId);
	for (const puzzleKey of CANONICAL_PUZZLE_KEYS) {
		const attempt = await orchestrator.startPuzzle({ puzzleKey });
		const result = await orchestrator.recordTerminal({ context: attempt.context, reason, completedAt: new Date(`${challengeId}T18:00:00`) });
		expect(result.kind).toBe('accepted');
	}
}

async function finishReplay(orchestrator: DailyChallengeOrchestrator, puzzleKeys: readonly DailyPuzzleKey[]) {
	for (const puzzleKey of puzzleKeys) {
		const attempt = await orchestrator.startReplay({ puzzleKey });
		const result = await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-01-27T18:00:00') });
		expect(result.kind).toBe('accepted');
	}
}

function expectReadyBundle(challengeId: ChallengeId): DailyCatalogBundle {
	const resolution = resolveDailyChallengeBundle({ challengeId });
	expect(resolution.kind).toBe('ready');
	if (resolution.kind !== 'ready') throw new Error('expected catalog bundle');
	return resolution.bundle;
}

describe('daily archive and replay lifecycle', () => {
	it('lists completed official challenges after restart', async () => {
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-01-26');
		await finishOfficial(makeOrchestrator(storage), challengeId);

		const model = await loadDailyArchiveModel({ now: new Date('2026-01-27T10:00:00'), store: makeStore(storage), entitled: true });

		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready archive');
		expect(model.items.find((item) => item.challengeId === challengeId)).toMatchObject({ statusLabel: 'Ufficiale completata', officialLabel: 'Primo risultato ufficiale bloccato', canReplay: true });
	});

	it('makes yesterday missed challenges playable as replay without streak credit', async () => {
		const storage = new MemoryProgressStorage();
		const yesterday = makeChallengeId('2026-01-26');
		const archive = await loadDailyArchiveModel({ now: new Date('2026-01-27T10:00:00'), store: makeStore(storage), entitled: true });

		expect(archive.kind).toBe('ready');
		if (archive.kind !== 'ready') throw new Error('expected ready archive');
		expect(archive.items.find((item) => item.challengeId === yesterday)).toMatchObject({ statusLabel: 'Mancata', canReplay: true, replayLabel: 'Gioca in replay' });
		const orchestrator = makeOrchestrator(storage);
		const loaded = await orchestrator.loadReplay({ challengeId: yesterday, now: new Date('2026-01-27T10:00:00') });
		expect(loaded.kind).toBe('ready');
		await finishReplay(orchestrator, CANONICAL_PUZZLE_KEYS);

		const progress = await makeStore(storage).load();
		expect(progress.ok).toBe(true);
		if (!progress.ok || progress.value.kind !== 'ready') throw new Error('expected ready progress');
		const record = progress.value.progress.challenges.find((candidate) => candidate.challengeId === yesterday);
		expect(record?.officialAttempt).toBeUndefined();
		expect(record?.replayAttempts).toHaveLength(1);
		expect(progress.value.progress.credits).toEqual([]);
	});

	it('does not treat an uncompleted today challenge as archive replay', async () => {
		const today = makeChallengeId('2026-01-26');

		const model = await loadDailyArchiveModel({ now: new Date('2026-01-26T10:00:00'), store: makeStore(new MemoryProgressStorage()), entitled: true });

		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready archive');
		expect(model.items.find((item) => item.challengeId === today)).toMatchObject({ statusLabel: 'Sfida di oggi', canReplay: false });
	});

	it('keeps official records immutable when replay results differ', async () => {
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-01-26');
		const orchestrator = makeOrchestrator(storage);
		await loadReady(orchestrator, challengeId);
		const official = await orchestrator.startPuzzle({ puzzleKey: 'parola' });
		await orchestrator.recordTerminal({ context: official.context, reason: 'win', completedAt: new Date('2026-01-26T18:00:00') });

		await orchestrator.loadReplay({ challengeId, now: new Date('2026-01-27T10:00:00') });
		const replay = await orchestrator.startReplay({ puzzleKey: 'parola' });
		await orchestrator.recordTerminal({ context: replay.context, reason: 'loss', completedAt: new Date('2026-01-27T18:00:00') });

		const progress = await makeStore(storage).load();
		expect(progress.ok).toBe(true);
		if (!progress.ok || progress.value.kind !== 'ready') throw new Error('expected ready progress');
		const record = progress.value.progress.challenges.find((candidate) => candidate.challengeId === challengeId);
		expect(record?.officialAttempt?.terminalEvents[0]?.reason).toBe('win');
		expect(record?.replayAttempts[0]?.terminalEvents[0]?.reason).toBe('loss');
	});

	it('loads replay from a stored bundle snapshot when live catalog resolution fails', async () => {
		const storage = new MemoryProgressStorage();
		const archivedId = makeChallengeId('2027-01-27');
		const snapshot = { ...expectReadyBundle(makeChallengeId('2026-01-26')), challengeId: archivedId, streakDate: makeStreakDate(archivedId) };
		const progress = makeProgressReady({
			schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION,
			challenges: [{ challengeId: archivedId, source: snapshot.source, bundleSnapshot: snapshot, migrationStatus: 'fresh', inProgressPuzzles: [], replayAttempts: [] }],
			credits: [],
			mutationEventIds: [],
		});
		storage.values.set(DAILY_PROGRESS_KEY, JSON.stringify(progress));

		const loaded = await makeOrchestrator(storage).loadReplay({ challengeId: archivedId, now: new Date('2027-01-28T10:00:00') });

		expect(resolveDailyChallengeBundle({ challengeId: archivedId }).kind).toBe('updateRequired');
		expect(loaded.kind).toBe('ready');
		if (loaded.kind !== 'ready') throw new Error('expected snapshot replay');
		expect(loaded.bundle.challengeId).toBe(archivedId);
		expect(loaded.bundle.catalogVersion).toBe(snapshot.catalogVersion);
	});
});
