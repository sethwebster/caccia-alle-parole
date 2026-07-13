import { describe, expect, it, vi } from 'vitest';
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

function makeOrchestrator(): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(new MemoryProgressStorage());
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function loadRouteModel(orchestrator = makeOrchestrator()) {
	const snapshot = await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
	return buildDailyRouteModel(snapshot);
}

describe('daily route model', () => {
	it('locks the hidden theme and exposes the current launch before completion', async () => {
		// Given: today's official challenge is loaded with no terminal events.
		const model = await loadRouteModel();

		// Then: the route can launch the first puzzle without exposing the theme answer.
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.currentPuzzleHref).toBe('/parola');
		expect(model.theme).toEqual({
			gate: 'locked',
			title: 'Tema nascosto custodito',
			body: 'Completa tutti e cinque i giochi per sbloccare il filo comune di oggi.',
		});
		expect(model.puzzles[0]).toMatchObject({ key: 'parola', statusLabel: 'Prossimo', canLaunch: true });
	});

	it('marks an active attempt as resumable and exposes give-up', async () => {
		// Given: the current official puzzle has started.
		const orchestrator = makeOrchestrator();
		await loadRouteModel(orchestrator);
		await orchestrator.startCurrentPuzzle({ now: new Date('2026-07-09T11:00:00') });

		// When: the route model is rebuilt from the active snapshot.
		const model = buildDailyRouteModel(orchestrator.getSnapshot());

		// Then: the screen can resume the active puzzle and show the give-up action.
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.currentActionLabel).toBe('Riprendi puzzle');
		expect(model.canGiveUp).toBe(true);
		expect(model.puzzles[0]?.statusLabel).toBe('In corso');
	});

	it('unlocks only the final theme label after all five terminal events', async () => {
		// Given: every official puzzle has reached a terminal state.
		const orchestrator = makeOrchestrator();
		await loadRouteModel(orchestrator);
		for (const puzzleKey of ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const) {
			const attempt = await orchestrator.startPuzzle({ puzzleKey });
			await orchestrator.recordTerminal({ context: attempt.context, reason: 'win', completedAt: new Date('2026-07-09T18:00:00') });
		}

		// When: the route model is rebuilt after completion.
		const model = buildDailyRouteModel(orchestrator.getSnapshot());

		// Then: progress is complete and the hidden theme copy is available.
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.progressLabel).toBe('5/5 giochi conclusi');
		expect(model.theme.gate).toBe('unlocked');
		expect(model.theme.title).not.toBe('Tema nascosto custodito');
		expect(model.puzzles.every((puzzle) => !puzzle.canLaunch)).toBe(true);
	});
});
