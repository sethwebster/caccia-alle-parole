import { describe, expect, it, vi } from 'vitest';

import { resolveDailyChallengeBundle } from './catalog';
import { makeChallengeId } from './date';
import { DailyChallengeOrchestrator, DailyChallengeOrchestratorStateError } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { DAILY_PROGRESS_KEY, DAILY_PROGRESS_QUARANTINE_KEY } from './progress-model';

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

function makeLegacyV1Progress(challengeId = makeChallengeId('2026-07-09')): string {
	const resolution = resolveDailyChallengeBundle({ challengeId });
	expect(resolution.kind).toBe('ready');
	if (resolution.kind !== 'ready') throw new Error('expected ready bundle');
	return JSON.stringify({
		schemaVersion: 1,
		challenges: [
			{
				challengeId,
				source: resolution.bundle.source,
				bundleSnapshot: resolution.bundle,
				migrationStatus: 'fresh',
				inProgressPuzzles: [],
				replayAttempts: [],
			},
		],
		credits: [],
		mutationEventIds: [],
	});
}

function makeOrchestrator(storage = new MemoryProgressStorage(), queue = new DailyProgressMutationQueue(createDailyProgressStore(storage))) {
	return new DailyChallengeOrchestrator({ store: createDailyProgressStore(storage), queue, entitlements: { currentEntitlement: async () => true } });
}

describe('daily orchestrator start recovery', () => {
	it.each([
		['migrated v1', makeLegacyV1Progress()],
		['quarantine reset', '{broken'],
	] as const)('returns a real active attempt after %s progress', async (_label, raw) => {
		const storage = new MemoryProgressStorage();
		storage.values.set(DAILY_PROGRESS_V1_KEY, raw);
		const orchestrator = makeOrchestrator(storage);

		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
		const attempt = await orchestrator.startCurrentPuzzle({ now: new Date('2026-07-09T12:00:00') });

		expect(attempt.context.puzzleKey).toBe('parola');
		expect(orchestrator.getSnapshot()).toMatchObject({ kind: 'ready', activeAttempt: attempt });
		expect(storage.values.get(DAILY_PROGRESS_KEY)).toContain('daily-orchestrator-active-attempt-v1');
		if (raw === '{broken') expect(storage.values.get(DAILY_PROGRESS_QUARANTINE_KEY)).toContain('{broken');
	});

	it.each(['startPuzzle', 'startReplay'] as const)('throws and sets progressError when %s persistence fails', async (method) => {
		const storage = new MemoryProgressStorage();
		const queue = {
			savePuzzleProgress: vi.fn().mockResolvedValue({ ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } }),
		} as unknown as DailyProgressMutationQueue;
		const orchestrator = makeOrchestrator(storage, queue);

		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });

		const start = method === 'startPuzzle' ? orchestrator.startPuzzle.bind(orchestrator) : orchestrator.startReplay.bind(orchestrator);
		await expect(start({ puzzleKey: 'parola' })).rejects.toBeInstanceOf(DailyChallengeOrchestratorStateError);
		expect(orchestrator.getSnapshot()).toEqual({ kind: 'progressError', error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } });
	});
});
