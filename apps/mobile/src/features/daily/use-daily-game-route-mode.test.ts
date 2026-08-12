import { describe, expect, it, vi } from 'vitest';

import { makeChallengeId } from './date';
import { attemptStartedAtForRoute } from './daily-route-attempt';
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

describe('daily game route attempt clock', () => {
	it('keeps the original start time after the terminal write clears the active attempt', async () => {
		const store = createDailyProgressStore(new MemoryProgressStorage());
		const orchestrator = new DailyChallengeOrchestrator({
			store,
			queue: new DailyProgressMutationQueue(store),
			entitlements: { currentEntitlement: async () => true },
		});
		const challengeId = makeChallengeId('2026-07-09');
		await orchestrator.loadOfficial({ challengeId, now: new Date('2026-07-09T10:00:00') });
		const attempt = await orchestrator.startPuzzle({ puzzleKey: 'parola', now: new Date('2026-07-09T11:00:00') });
		const active = orchestrator.getSnapshot();
		if (active.kind !== 'ready') throw new Error('expected ready daily challenge');

		expect(attemptStartedAtForRoute(active, attempt.context)).toBe(attempt.startedAt);

		await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T11:01:00') });
		const terminal = orchestrator.getSnapshot();
		if (terminal.kind !== 'ready') throw new Error('expected ready daily challenge');

		expect(terminal.activeAttempt).toBeUndefined();
		expect(attemptStartedAtForRoute(terminal, attempt.context)).toBe(attempt.startedAt);
	});

	it('restores the active replay identified by the game route', async () => {
		const store = createDailyProgressStore(new MemoryProgressStorage());
		const orchestrator = new DailyChallengeOrchestrator({
			store,
			queue: new DailyProgressMutationQueue(store),
			entitlements: { currentEntitlement: async () => true },
		});
		const challengeId = makeChallengeId('2026-07-08');
		await orchestrator.loadReplay({ challengeId, now: new Date('2026-07-09T10:00:00') });
		const attempt = await orchestrator.startReplay({ puzzleKey: 'parola', now: new Date('2026-07-09T11:00:00') });

		await orchestrator.loadReplay({ challengeId, activeReplayAttemptId: attempt.context.attemptId });
		const restored = orchestrator.getSnapshot();
		if (restored.kind !== 'ready') throw new Error('expected ready replay');

		expect(restored.activeAttempt).toMatchObject(attempt);
	});
});
