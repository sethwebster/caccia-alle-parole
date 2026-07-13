import { Observe } from 'expo-observe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeChallengeId } from './date';
import { buildDailyResultShareModel } from './daily-share';
import { DailyChallengeOrchestrator } from './orchestrator-service';
import { createDailyProgressStore, DailyProgressMutationQueue } from './progress';
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

function makeOrchestrator(): DailyChallengeOrchestrator {
	const store = createDailyProgressStore(new MemoryProgressStorage());
	return new DailyChallengeOrchestrator({ store, queue: new DailyProgressMutationQueue(store), entitlements: { currentEntitlement: async () => true } });
}

async function finishPuzzle(orchestrator: DailyChallengeOrchestrator, puzzleKey: DailyPuzzleKey, reason: TerminalReason): Promise<void> {
	const attempt = await orchestrator.startPuzzle({ puzzleKey });
	const result = await orchestrator.recordTerminal({ context: attempt.context, reason, completedAt: new Date('2026-07-09T18:00:00') });
	expect(result.kind).toBe('accepted');
}

describe('Daily Challenge share model', () => {
	it('keeps incomplete official share locked until all five terminal records exist', async () => {
		// Given
		const orchestrator = makeOrchestrator();
		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });

		// When
		const snapshot = orchestrator.getSnapshot();
		if (snapshot.kind !== 'ready') throw new Error('expected ready daily challenge');
		const share = buildDailyResultShareModel(snapshot, '/daily');

		// Then
		expect(share).toEqual({
			kind: 'locked',
			title: 'Condivisione bloccata',
			body: 'Completa i cinque giochi ufficiali per generare un riepilogo senza spoiler.',
			buttonLabel: 'Completa la sfida',
		});
	});

	it('builds spoiler-safe official text from immutable terminal records', async () => {
		// Given
		const orchestrator = makeOrchestrator();
		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
		const reasons: readonly TerminalReason[] = ['win', 'loss', 'skip', 'giveUp', 'win'];

		// When
		for (const [index, puzzleKey] of CANONICAL_PUZZLE_KEYS.entries()) await finishPuzzle(orchestrator, puzzleKey, reasons[index] ?? 'loss');
		const snapshot = orchestrator.getSnapshot();
		if (snapshot.kind !== 'ready') throw new Error('expected ready daily challenge');
		const share = buildDailyResultShareModel(snapshot, '/daily');

		// Then
		expect(share.kind).toBe('available');
		if (share.kind !== 'available') throw new Error('expected share text');
		expect(share.text).toContain('Riepilogo ufficiale: 2/5 vittorie');
		expect(share.text).toContain('🟩⬛⬜🟥🟩');
		expect(share.text).toContain('Apri la sfida: /daily');
		expect(share.text).not.toContain(snapshot.bundle.theme.label);
		expect(share.text).not.toContain(snapshot.bundle.theme.explanation);
		for (const choice of snapshot.bundle.theme.choices) expect(share.text).not.toContain(choice);
		for (const puzzle of snapshot.bundle.puzzles) expect(share.text).not.toContain(puzzle.target);
	});

	it('includes theme quiz correctness only after the official answer is saved', async () => {
		// Given
		const orchestrator = makeOrchestrator();
		await orchestrator.loadOfficial({ challengeId: makeChallengeId('2026-07-09'), now: new Date('2026-07-09T10:00:00') });
		for (const puzzleKey of CANONICAL_PUZZLE_KEYS) await finishPuzzle(orchestrator, puzzleKey, 'win');
		const completed = orchestrator.getSnapshot();
		if (completed.kind !== 'ready') throw new Error('expected ready daily challenge');

		// When
		const unansweredShare = buildDailyResultShareModel(completed, '/daily');
		await orchestrator.recordThemeAnswer({ answerIndex: completed.bundle.theme.answerIndex, answeredAt: new Date('2026-07-09T19:00:00') });
		const answered = orchestrator.getSnapshot();
		if (answered.kind !== 'ready') throw new Error('expected ready daily challenge');
		const answeredShare = buildDailyResultShareModel(answered, '/daily');

		// Then
		expect(unansweredShare.kind).toBe('available');
		expect(answeredShare.kind).toBe('available');
		if (unansweredShare.kind !== 'available' || answeredShare.kind !== 'available') throw new Error('expected share text');
		expect(unansweredShare.text).not.toContain('Quiz tema');
		expect(answeredShare.text).toContain('Quiz tema: esatto');
		expect(answeredShare.text).not.toContain(answered.bundle.theme.label);
		expect(answeredShare.text).not.toContain(answered.bundle.theme.explanation);
	});
});
