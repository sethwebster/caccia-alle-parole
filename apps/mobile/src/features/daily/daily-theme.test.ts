import { Observe } from 'expo-observe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeChallengeId } from './date';
import { buildDailyRouteModel, DailyRouteThemeMetadataError } from './daily-route-model';
import type { DailyChallengeReadySnapshot } from './orchestrator-model';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
import { resolveDailyChallengeBundle, validateDailyChallengeBundle } from './catalog';
import { CANONICAL_PUZZLE_KEYS, type DailyPuzzleKey, type TerminalReason } from './types';

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

beforeEach(() => {
	vi.mocked(Observe.logEvent).mockClear();
});

function makeOrchestrator(storage = new MemoryProgressStorage()): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(storage);
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function loadOfficial(orchestrator: DailyChallengeOrchestrator): Promise<DailyChallengeReadySnapshot> {
	const snapshot = await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
	expect(snapshot.kind).toBe('ready');
	if (snapshot.kind !== 'ready') throw new Error('expected ready daily challenge');
	return snapshot;
}

function readySnapshot(orchestrator: DailyChallengeOrchestrator): DailyChallengeReadySnapshot {
	const snapshot = orchestrator.getSnapshot();
	expect(snapshot.kind).toBe('ready');
	if (snapshot.kind !== 'ready') throw new Error('expected ready daily challenge');
	return snapshot;
}

async function finishPuzzle(input: {
	readonly orchestrator: DailyChallengeOrchestrator;
	readonly puzzleKey: DailyPuzzleKey;
	readonly reason: TerminalReason;
}): Promise<void> {
	const attempt = await input.orchestrator.startPuzzle({ puzzleKey: input.puzzleKey });
	const result = await input.orchestrator.recordTerminal({
		context: attempt.context,
		reason: input.reason,
		completedAt: new Date('2026-07-09T18:00:00'),
	});
	expect(result.kind).toBe('accepted');
}

async function finishChallenge(orchestrator: DailyChallengeOrchestrator): Promise<void> {
	const reasons: readonly TerminalReason[] = ['win', 'loss', 'skip', 'giveUp', 'win'];
	for (const [index, puzzleKey] of CANONICAL_PUZZLE_KEYS.entries()) {
		await finishPuzzle({ orchestrator, puzzleKey, reason: reasons[index] ?? 'loss' });
	}
}

describe('daily hidden theme quiz lifecycle', () => {
	it('keeps theme metadata choices and answer hidden at four terminal puzzles', async () => {
		// Given: four official puzzles have terminal results.
		const orchestrator = makeOrchestrator();
		await loadOfficial(orchestrator);
		for (const puzzleKey of ['parola', 'caccia', 'paroliere', 'impiccato'] as const) {
			await finishPuzzle({ orchestrator, puzzleKey, reason: 'win' });
		}

		// When: the route model is rendered before the fifth terminal result.
		const model = buildDailyRouteModel(readySnapshot(orchestrator));

		// Then: no theme text, explanation, or choices are exposed.
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.theme).toEqual({
			gate: 'locked',
			title: 'Tema nascosto custodito',
			body: 'Completa tutti e cinque i giochi per sbloccare il filo comune di oggi.',
		});
	});

	it('shows an unanswered quiz after all five terminal outcomes including losses and skips', async () => {
		// Given: the official challenge ended through mixed terminal reasons.
		const orchestrator = makeOrchestrator();
		const initial = await loadOfficial(orchestrator);
		await finishChallenge(orchestrator);

		// When: the route model is rendered after completion.
		const model = buildDailyRouteModel(readySnapshot(orchestrator));

		// Then: the quiz prompt and choices are available, but feedback is not shown yet.
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.theme).toMatchObject({
			gate: 'unlocked',
			status: 'unanswered',
			title: 'Indovina il tema nascosto',
			prompt: initial.bundle.theme.choices.length === 4 ? 'Quale tema nascosto collega i cinque giochi di oggi?' : '',
			choices: initial.bundle.theme.choices,
		});
		expect(model.theme).not.toHaveProperty('explanation');
	});

	it('persists the official selected answer and renders feedback with explanation', async () => {
		// Given: the official quiz is unlocked.
		const storage = new MemoryProgressStorage();
		const orchestrator = makeOrchestrator(storage);
		await loadOfficial(orchestrator);
		await finishChallenge(orchestrator);
		const answerIndex = 1;

		// When: the learner answers and the app reloads official progress.
		const result = await orchestrator.recordThemeAnswer({ answerIndex, answeredAt: new Date('2026-07-09T19:00:00'), eventId: 'theme-answer-1' });
		const reloaded = makeOrchestrator(storage);
		await loadOfficial(reloaded);
		const model = buildDailyRouteModel(readySnapshot(reloaded));

		// Then: the selected answer is persisted and explanation appears only after answering.
		expect(result.kind).toBe('accepted');
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.theme).toMatchObject({
			gate: 'unlocked',
			status: 'answered',
			selectedAnswerIndex: answerIndex,
			explanation: readySnapshot(reloaded).bundle.theme.explanation,
		});
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.theme_answered', { attributes: { challengeId: makeChallengeId('2026-07-09'), correct: answerIndex === readySnapshot(reloaded).bundle.theme.answerIndex } });
	});

	it('fails fast when unlocked theme prompt metadata is missing', async () => {
		// Given: a completed snapshot with malformed archived theme metadata.
		const orchestrator = makeOrchestrator();
		await loadOfficial(orchestrator);
		await finishChallenge(orchestrator);
		const snapshot = readySnapshot(orchestrator);
		const malformed = { ...snapshot, bundle: { ...snapshot.bundle, puzzles: [] } };

		// When / Then: the route model refuses to render hidden fallback copy.
		expect(() => buildDailyRouteModel(malformed)).toThrow(DailyRouteThemeMetadataError);
	});

	it('validates per-puzzle linkage and plausible unique distractors', () => {
		// Given: a generated catalog bundle.
		const resolution = resolveDailyChallengeBundle({ challengeId: makeChallengeId('2026-07-09') });

		// When: the bundle is validated.
		expect(resolution.kind).toBe('ready');
		if (resolution.kind !== 'ready') throw new Error('expected ready bundle');

		// Then: every puzzle links to the hidden theme and choices are non-duplicate plausible alternatives.
		expect(validateDailyChallengeBundle(resolution.bundle)).toEqual({ kind: 'valid' });
		expect(new Set(resolution.bundle.theme.choices).size).toBe(4);
		for (const choice of resolution.bundle.theme.choices) {
			expect(choice.trim().length).toBeGreaterThan(4);
		}
		for (const puzzle of resolution.bundle.puzzles) {
			expect(puzzle.themeId).toBe(resolution.bundle.theme.themeId);
			expect(puzzle.themeQuiz.choices).toEqual(resolution.bundle.theme.choices);
		}
	});

	it('rejects replay theme answers and preserves the official answer', async () => {
		// Given: an official answer already exists.
		const storage = new MemoryProgressStorage();
		const orchestrator = makeOrchestrator(storage);
		await loadOfficial(orchestrator);
		await finishChallenge(orchestrator);
		await orchestrator.recordThemeAnswer({ answerIndex: 0, answeredAt: new Date('2026-07-09T19:00:00'), eventId: 'official-theme' });

		// When: replay mode attempts to answer differently.
		const replay = makeOrchestrator(storage);
		const replaySnapshot = await replay.loadReplay({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-10T10:00:00') });
		expect(replaySnapshot.kind).toBe('ready');
		const replayResult = await replay.recordThemeAnswer({ answerIndex: 2, answeredAt: new Date('2026-07-10T10:05:00'), eventId: 'replay-theme' });

		// Then: replay cannot overwrite the official selected answer.
		const official = makeOrchestrator(storage);
		await loadOfficial(official);
		const model = buildDailyRouteModel(readySnapshot(official));
		expect(replayResult).toEqual({ kind: 'rejected', reason: 'replayMode' });
		expect(model.kind).toBe('ready');
		if (model.kind !== 'ready') throw new Error('expected ready route model');
		expect(model.theme).toMatchObject({ status: 'answered', selectedAnswerIndex: 0 });
	});
});
