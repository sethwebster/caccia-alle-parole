import { describe, expect, it, vi } from 'vitest';

import { loadDailyArchiveModel } from './daily-archive-model';
import { DAILY_COPY } from './daily-copy';
import { buildDailyRouteModel } from './daily-route-model';
import { makeChallengeId } from './date';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';

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

function makeOrchestrator(entitled: boolean): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(new MemoryProgressStorage());
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => entitled } });
}

const CHALLENGE_ID = makeChallengeId('2026-01-27');
const NOW = new Date('2026-01-27T10:00:00');

describe('daily challenge subscription gate', () => {
	it('blocks the official load for non-subscribers', async () => {
		const snapshot = await makeOrchestrator(false).loadOfficial({ challengeId: CHALLENGE_ID, now: NOW });
		expect(snapshot).toEqual({ kind: 'subscriptionRequired', challengeId: CHALLENGE_ID });
	});

	it('derives the challenge id from the clock when none is requested', async () => {
		const snapshot = await makeOrchestrator(false).loadOfficial({ now: NOW });
		expect(snapshot).toEqual({ kind: 'subscriptionRequired', challengeId: CHALLENGE_ID });
	});

	it('blocks replays for non-subscribers', async () => {
		const snapshot = await makeOrchestrator(false).loadReplay({ challengeId: CHALLENGE_ID, now: NOW });
		expect(snapshot).toEqual({ kind: 'subscriptionRequired', challengeId: CHALLENGE_ID });
	});

	it('loads normally for subscribers', async () => {
		const snapshot = await makeOrchestrator(true).loadOfficial({ challengeId: CHALLENGE_ID, now: NOW });
		expect(snapshot.kind).toBe('ready');
	});

	it('maps the gated snapshot to a paywall route model', () => {
		const model = buildDailyRouteModel({ kind: 'subscriptionRequired', challengeId: CHALLENGE_ID });
		expect(model.kind).toBe('subscriptionRequired');
		if (model.kind !== 'subscriptionRequired') throw new Error('expected subscriptionRequired model');
		expect(model.tone).toBe('warning');
	});
});

describe('daily archive subscription gate', () => {
	it('marks past days as premium-locked for non-subscribers', async () => {
		const model = await loadDailyArchiveModel({ now: NOW, store: createDailyProgressStore(new MemoryProgressStorage()), entitled: false });
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready archive');
		const pastDay = model.items.find((item) => item.challengeId === makeChallengeId('2026-01-26'));
		expect(pastDay).toMatchObject({ canReplay: false, requiresSubscription: true, replayLabel: DAILY_COPY.archive.replay.premium });
	});

	it('keeps past days replayable for subscribers', async () => {
		const model = await loadDailyArchiveModel({ now: NOW, store: createDailyProgressStore(new MemoryProgressStorage()), entitled: true });
		if (model.kind !== 'ready') throw new Error('expected ready archive');
		const pastDay = model.items.find((item) => item.challengeId === makeChallengeId('2026-01-26'));
		expect(pastDay).toMatchObject({ canReplay: true, requiresSubscription: false });
	});
});
