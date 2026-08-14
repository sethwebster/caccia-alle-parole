import { describe, expect, it, vi } from 'vitest';

import { CATALOG_METADATA } from './catalog';
import { challengeIdAfterDays, makeChallengeId } from './date';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type DailyPuzzleKey } from './types';

vi.mock('expo-observe', () => ({ Observe: { logEvent: vi.fn() } }));

const STALE_VERSION = '2026.01.26';
/** Five letters so an aged Paròle target still parses like a real one. */
const STALE_TARGET = 'ZUPPA';

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

/** Loads a day the way a returning player does: a fresh orchestrator over the same stored progress. */
async function targetsFor(storage: MemoryProgressStorage, challengeId: ChallengeId): Promise<Record<DailyPuzzleKey, string>> {
	const snapshot = await makeOrchestrator(storage).loadOfficial({ challengeId });
	if (snapshot.kind !== 'ready') throw new Error(`${challengeId} not ready: ${snapshot.kind}`);
	return Object.fromEntries(snapshot.bundle.puzzles.map((puzzle) => [puzzle.key, puzzle.target])) as Record<DailyPuzzleKey, string>;
}

async function playWholeChallenge(storage: MemoryProgressStorage, challengeId: ChallengeId): Promise<void> {
	const orchestrator = makeOrchestrator(storage);
	await orchestrator.loadOfficial({ challengeId });
	for (const puzzleKey of CANONICAL_PUZZLE_KEYS) {
		const attempt = await orchestrator.startPuzzle({ puzzleKey });
		await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date(`${challengeId}T18:00:00`) });
	}
}

describe('daily challenge package rotation', () => {
	it('changes every puzzle every day across a played fortnight', async () => {
		// Given: a player who finishes the whole challenge fourteen days running.
		const storage = new MemoryProgressStorage();
		const days = Array.from({ length: 14 }, (_, index) => challengeIdAfterDays(makeChallengeId('2026-08-13'), index));
		const seen: Record<DailyPuzzleKey, string>[] = [];

		// When: each day is loaded and played through.
		for (const day of days) {
			seen.push(await targetsFor(storage, day));
			await playWholeChallenge(storage, day);
		}

		// Then: no puzzle ever repeats its target on consecutive days.
		const repeats = days.flatMap((day, index) =>
			index === 0 ? [] : CANONICAL_PUZZLE_KEYS.filter((key) => seen[index]?.[key] === seen[index - 1]?.[key]).map((key) => `${day} ${key}=${seen[index]?.[key]}`),
		);
		expect(repeats).toEqual([]);
	});

	it('refreshes a day opened under a superseded catalog before anything was finished', async () => {
		// Given: a day started under an older catalog version and abandoned before any result.
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-08-13');
		const orchestrator = makeOrchestrator(storage);
		const fresh = await orchestrator.loadOfficial({ challengeId });
		if (fresh.kind !== 'ready') throw new Error('expected ready challenge');
		await orchestrator.startPuzzle({ puzzleKey: 'parola' });
		stalePreviousRelease(storage);

		// When: the player returns after the content update lands.
		const reloaded = await targetsFor(storage, challengeId);

		// Then: the refreshed catalog wins over the stale snapshot.
		expect(reloaded).toEqual(Object.fromEntries(fresh.bundle.puzzles.map((puzzle) => [puzzle.key, puzzle.target])));
		expect(Object.values(reloaded)).not.toContain(STALE_TARGET);
	});

	it('keeps a superseded snapshot once a result has been recorded', async () => {
		// Given: a day with one finished puzzle, archived under an older catalog version.
		const storage = new MemoryProgressStorage();
		const challengeId = makeChallengeId('2026-08-13');
		const orchestrator = makeOrchestrator(storage);
		await orchestrator.loadOfficial({ challengeId });
		const attempt = await orchestrator.startPuzzle({ puzzleKey: 'parola' });
		await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-08-13T18:00:00') });
		stalePreviousRelease(storage);
		const archivedTargets = storedArchivedTargets(storage, challengeId);

		// When: the player returns to that day.
		const reloaded = await targetsFor(storage, challengeId);

		// Then: the played day is preserved exactly so its result stays honest.
		expect(reloaded).toEqual(archivedTargets);
		expect(Object.values(reloaded)).toContain(STALE_TARGET);
		expect(CATALOG_METADATA.catalogVersion).not.toBe(STALE_VERSION);
	});
});

function eachStoredValue(storage: MemoryProgressStorage, mutate: (parsed: Record<string, unknown>) => void): void {
	for (const [key, raw] of storage.values) {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		mutate(parsed);
		storage.values.set(key, JSON.stringify(parsed));
	}
}

/**
 * Ages every archived snapshot into a previous release — version AND targets, so
 * a regenerated bundle is distinguishable from a reused one. Staling the version
 * alone proves nothing: both paths would yield today's targets either way.
 */
function stalePreviousRelease(storage: MemoryProgressStorage): void {
	eachStoredValue(storage, (parsed) => {
		for (const record of challengeRecords(parsed)) {
			const snapshot = record.bundleSnapshot as { catalogVersion?: string; puzzles?: { target: string }[] } | undefined;
			if (snapshot === undefined) continue;
			snapshot.catalogVersion = STALE_VERSION;
			for (const puzzle of snapshot.puzzles ?? []) puzzle.target = STALE_TARGET;
		}
	});
}

function storedArchivedTargets(storage: MemoryProgressStorage, challengeId: ChallengeId): Record<string, string> {
	for (const raw of storage.values.values()) {
		for (const record of challengeRecords(JSON.parse(raw) as Record<string, unknown>)) {
			if (record.challengeId !== challengeId) continue;
			const snapshot = record.bundleSnapshot as { readonly puzzles?: readonly { key: string; target: string }[] } | undefined;
			if (snapshot?.puzzles !== undefined) return Object.fromEntries(snapshot.puzzles.map((puzzle) => [puzzle.key, puzzle.target]));
		}
	}
	throw new Error(`no archived snapshot for ${challengeId}`);
}

function challengeRecords(parsed: Record<string, unknown>): Record<string, unknown>[] {
	const challenges = Reflect.get(parsed, 'challenges') ?? Reflect.get(Reflect.get(parsed, 'progress') ?? {}, 'challenges');
	return Array.isArray(challenges) ? (challenges as Record<string, unknown>[]) : [];
}
