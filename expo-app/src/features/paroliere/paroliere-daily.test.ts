import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TerminalAttemptContext } from '@/features/daily/types';
import { makeChallengeId } from '@/features/daily/date';

import { ParoliereChallengeConfigError, ParoliereService } from './service';

const activity = vi.hoisted(() => ({
	endParoliereActivity: vi.fn(),
	startParoliereActivity: vi.fn(),
	updateParoliereActivity: vi.fn(),
}));

vi.mock('expo-observe', () => ({ Observe: { logEvent: vi.fn() } }));
vi.mock('@/lib/live-activity', () => activity);
vi.mock('./dictionary', () => ({ isValidWord: (word: string) => word.toLowerCase() === 'mare' }));

const canonicalGrid = [
	['M', 'A', 'R', 'E'],
	['S', 'O', 'L', 'E'],
	['L', 'U', 'N', 'A'],
	['V', 'E', 'N', 'T'],
] as const;

const challengeContext: TerminalAttemptContext = {
	challengeId: makeChallengeId('2026-01-26'),
	puzzleKey: 'paroliere',
	attemptKind: 'official',
	attemptId: 'attempt-1',
	terminalEventId: 'terminal-1',
};

function createChallengeService(durationSeconds = 90): ParoliereService {
	return new ParoliereService({
		challenge: {
			context: challengeContext,
			durationSeconds,
			grid: canonicalGrid,
		},
	});
}

describe('paroliere daily challenge mode', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-26T10:00:00.000Z'));
		activity.endParoliereActivity.mockClear();
		activity.startParoliereActivity.mockClear();
		activity.updateParoliereActivity.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('initializes the exact canonical grid and duration supplied by the challenge payload', () => {
		const service = createChallengeService(90);

		service.startGame();

		expect(service.getState().grid).toEqual(canonicalGrid);
		expect(service.getState().timeLeft).toBe(90);
		expect(activity.startParoliereActivity).toHaveBeenCalledTimes(1);
		expect(activity.startParoliereActivity).toHaveBeenCalledWith({ score: 0, secondsLeft: 90, wordsFound: 0 });
	});

	it('rejects malformed non-4x4 challenge grids before the round starts', () => {
		expect(
			() =>
				new ParoliereService({
					challenge: {
						context: challengeContext,
						durationSeconds: 90,
						grid: [['A'], ['B'], ['C'], ['D']],
					},
				}),
		).toThrow(ParoliereChallengeConfigError);
	});

	it('does not call Math.random when starting challenge rounds', () => {
		const randomSpy = vi.spyOn(Math, 'random');
		const service = createChallengeService();

		service.startGame();

		expect(randomSpy).not.toHaveBeenCalled();
		randomSpy.mockRestore();
	});

	it('starts repeated challenge rounds from fresh unfinished state', () => {
		const service = createChallengeService(90);
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });
		service.extendSelection({ row: 0, col: 3 });
		service.release();
		service.giveUp('giveUp');

		service.startGame();

		expect(service.getState()).toMatchObject({
			currentPath: [],
			currentWord: '',
			foundWords: [],
			gameState: 'playing',
			lastOutcome: null,
			score: 0,
			timeLeft: 90,
		});
		expect(service.getTerminalSummary()).toBeNull();
	});

	it('reports a serializable loss summary when the timer finishes', () => {
		const service = createChallengeService(1);
		service.startGame();

		vi.advanceTimersByTime(1_000);

		expect(service.getState().gameState).toBe('finished');
		expect(JSON.parse(JSON.stringify(service.getTerminalSummary()))).toEqual({
			context: challengeContext,
			foundWords: [],
			puzzleKey: 'paroliere',
			reason: 'loss',
			score: 0,
			timeLeft: 0,
			totalWords: 0,
		});
		expect(activity.endParoliereActivity).toHaveBeenCalledTimes(1);
	});

	it('reports serializable skip and giveUp summaries for explicit terminal actions', () => {
		const skipService = createChallengeService();
		skipService.startGame();
		const skipSummary = skipService.giveUp('skip');

		const giveUpService = createChallengeService();
		giveUpService.startGame();
		const giveUpSummary = giveUpService.giveUp('giveUp');

		expect(JSON.parse(JSON.stringify(skipSummary))).toMatchObject({ context: challengeContext, reason: 'skip', score: 0 });
		expect(JSON.parse(JSON.stringify(giveUpSummary))).toMatchObject({ context: challengeContext, reason: 'giveUp', score: 0 });
		expect(activity.startParoliereActivity).toHaveBeenCalledTimes(2);
		expect(activity.endParoliereActivity).toHaveBeenCalledTimes(2);
	});

	it('keeps Live Activity start, update, and end lifecycle balanced in challenge mode', () => {
		const service = createChallengeService();
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });
		service.extendSelection({ row: 0, col: 3 });
		service.release();
		service.giveUp('giveUp');
		service.destroy();

		expect(activity.startParoliereActivity).toHaveBeenCalledTimes(1);
		expect(activity.updateParoliereActivity).toHaveBeenCalledTimes(1);
		expect(activity.endParoliereActivity).toHaveBeenCalledTimes(1);
	});
});
