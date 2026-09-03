import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TerminalAttemptContext } from '@/features/daily/types';
import { makeChallengeId } from '@/features/daily/date';

import { findParoliereCellAtPoint } from './paroliere-board-hit-test';
import { ParoliereChallengeConfigError, ParoliereService, paroliereDefineTarget } from './service';

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
const boardHitTestGeometry = { boardSize: 360, gap: 10, gridSize: 4 } as const;
const boardTileSize = (boardHitTestGeometry.boardSize - boardHitTestGeometry.gap * 3) / 4;

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

	it('truncates the active path when extending over an earlier selected tile', () => {
		const service = createChallengeService(90);
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });

		service.extendSelection({ row: 0, col: 1 });

		expect(service.getState().currentPath).toEqual([
			{ row: 0, col: 0 },
			{ row: 0, col: 1 },
		]);
		expect(service.getState().currentWord).toBe('MA');
	});

	it('fills a skipped intermediate tile when a fast diagonal drag misses an update frame', () => {
		const service = createChallengeService(90);
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });

		service.extendSelection({ row: 2, col: 2 });

		expect(service.getState().currentPath).toEqual([
			{ row: 0, col: 0 },
			{ row: 1, col: 1 },
			{ row: 2, col: 2 },
		]);
		expect(service.getState().currentWord).toBe('MON');
	});

	it('recovers an adjacent path around a missed drag corner', () => {
		const service = createChallengeService(90);
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });

		service.extendSelection({ row: 2, col: 1 });

		expect(service.getState().currentPath).toEqual([
			{ row: 0, col: 0 },
			{ row: 1, col: 1 },
			{ row: 2, col: 1 },
		]);
	});

	it('hit-tests points near a tile centre as inside that tile', () => {
		expect(
			findParoliereCellAtPoint({
				...boardHitTestGeometry,
				x: boardTileSize / 2,
				y: boardTileSize / 2,
			}),
		).toEqual({ row: 0, col: 0 });
	});

	it('keeps tile corners selectable for smooth diagonal drags', () => {
		expect(
			findParoliereCellAtPoint({
				...boardHitTestGeometry,
				x: boardTileSize - 0.25,
				y: boardTileSize - 0.25,
			}),
		).toEqual({ row: 0, col: 0 });
	});

	it('keeps the diagonal side of a tile selectable close to its corner', () => {
		expect(
			findParoliereCellAtPoint({
				...boardHitTestGeometry,
				x: 75,
				y: 75,
			}),
		).toEqual({ row: 0, col: 0 });
	});

	it('hit-tests points in the gap between tiles as empty board space', () => {
		expect(
			findParoliereCellAtPoint({
				...boardHitTestGeometry,
				x: boardTileSize + boardHitTestGeometry.gap / 2,
				y: boardTileSize / 2,
			}),
		).toBeNull();
	});

	it('hit-tests points outside the board as empty board space', () => {
		expect(
			findParoliereCellAtPoint({
				...boardHitTestGeometry,
				x: boardHitTestGeometry.boardSize,
				y: boardTileSize / 2,
			}),
		).toBeNull();
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

	it('offers the actively traced word for definition before it is submitted', () => {
		const service = createChallengeService();
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });
		service.extendSelection({ row: 0, col: 3 });

		const state = service.getState();

		expect(state.currentWord).toBe('MARE');
		expect(paroliereDefineTarget(state.currentWord, state.lastOutcome)).toBe('MARE');
	});

	it('keeps the released word definable after release clears the traced word', () => {
		const service = createChallengeService();
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });
		service.extendSelection({ row: 0, col: 3 });

		service.release();
		const state = service.getState();

		// release() clears currentWord on every branch, so without the outcome
		// fallback the define affordance is unreachable the moment a finger lifts.
		expect(state.currentWord).toBe('');
		expect(paroliereDefineTarget(state.currentWord, state.lastOutcome)).toBe('MARE');
	});

	it('keeps the last attempt definable whether or not it scored', () => {
		const service = createChallengeService();
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 1, col: 1 });
		service.extendSelection({ row: 2, col: 2 });

		service.release();
		const state = service.getState();

		// Deliberately makes no claim about MON's validity: this file's
		// vi.mock('./dictionary') never applies (service.ts imports
		// '@/lib/dictionary'), so these run against the real dictionary.
		expect(state.lastOutcome?.word).toBe('MON');
		expect(paroliereDefineTarget(state.currentWord, state.lastOutcome)).toBe('MON');
	});

	it('stops offering the previous attempt once the next trace begins', () => {
		const service = createChallengeService();
		service.startGame();
		service.beginSelection({ row: 0, col: 0 });
		service.extendSelection({ row: 0, col: 1 });
		service.extendSelection({ row: 0, col: 2 });
		service.extendSelection({ row: 0, col: 3 });
		service.release();

		service.beginSelection({ row: 1, col: 1 });
		const state = service.getState();

		expect(state.lastOutcome).toBeNull();
		expect(paroliereDefineTarget(state.currentWord, state.lastOutcome)).toBeNull();
	});

	it('never offers a bare letter or a sub-scoring fragment for definition', () => {
		expect(paroliereDefineTarget('M', null)).toBeNull();
		expect(paroliereDefineTarget('MA', null)).toBeNull();
		expect(paroliereDefineTarget('', null)).toBeNull();
		expect(paroliereDefineTarget('', { word: 'MA', valid: false, nonce: 1 })).toBeNull();
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
