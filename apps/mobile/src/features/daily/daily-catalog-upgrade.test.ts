import { describe, expect, it, vi } from 'vitest';

import { CATALOG_METADATA } from './catalog';
import { makeChallengeId } from './date';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId } from './types';

vi.mock('expo-observe', () => ({ Observe: { logEvent: vi.fn() } }));

/** The catalog version shipped before the rotation fix. */
const PREVIOUS_CATALOG_VERSION = '2026.01.26';

class MemoryProgressStorage {
	readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}

function makeOrchestrator(storage: MemoryProgressStorage): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(storage);
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function completeWholeChallenge(storage: MemoryProgressStorage, challengeId: ChallengeId): Promise<void> {
	const orchestrator = makeOrchestrator(storage);
	await orchestrator.loadOfficial({ challengeId });
	for (const puzzleKey of CANONICAL_PUZZLE_KEYS) {
		const attempt = await orchestrator.startPuzzle({ puzzleKey });
		await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date(`${challengeId}T18:00:00`) });
	}
}

/** Rewrites stored snapshots to look like the previous content release wrote them. */
function ageToPreviousRelease(storage: MemoryProgressStorage): void {
	for (const [key, raw] of storage.values) {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		for (const record of (parsed.challenges as Record<string, unknown>[] | undefined) ?? []) {
			const snapshot = record.bundleSnapshot as Record<string, unknown> | undefined;
			if (snapshot === undefined) continue;
			snapshot.catalogVersion = PREVIOUS_CATALOG_VERSION;
			(snapshot.source as Record<string, unknown>).version = PREVIOUS_CATALOG_VERSION;
		}
		storage.values.set(key, JSON.stringify(parsed));
	}
}

describe('upgrading onto a new catalog version', () => {
	it('keeps history and streaks written by the previous release', async () => {
		// Given: a player who completed two consecutive days before the content update.
		const storage = new MemoryProgressStorage();
		await completeWholeChallenge(storage, makeChallengeId('2026-08-13'));
		await completeWholeChallenge(storage, makeChallengeId('2026-08-14'));
		const before = await createDailyProgressStore(storage).load();
		if (!before.ok || before.value.kind !== 'ready') throw new Error('expected ready progress');
		const streakBefore = before.value.progress.statsSummary.currentStreak;

		// When: the catalog version moves on underneath their stored progress.
		ageToPreviousRelease(storage);
		const after = await createDailyProgressStore(storage).load();

		// Then: nothing is quarantined — the record count and streak survive intact.
		expect(PREVIOUS_CATALOG_VERSION).not.toBe(CATALOG_METADATA.catalogVersion);
		expect(streakBefore).toBeGreaterThan(0);
		expect(after.ok).toBe(true);
		if (!after.ok || after.value.kind !== 'ready') throw new Error('progress was quarantined by a catalog version bump');
		expect(after.value.progress.challenges).toHaveLength(2);
		expect(after.value.progress.statsSummary.currentStreak).toBe(streakBefore);
	});
});
