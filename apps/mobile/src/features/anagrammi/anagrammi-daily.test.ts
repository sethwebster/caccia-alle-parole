import { describe, expect, it, vi } from 'vitest';

import { dailyPuzzleAdapters } from '@/features/daily/adapters';
import { makeChallengeId } from '@/features/daily/date';

import {
	anagrammiReducer,
	parseSavedProgress,
} from './anagrammi-service';
import { createAnagrammiChallengeState, createAnagrammiChallengeSummary, type AnagrammiChallengePayload } from './anagrammi-daily';

const challengePayload: AnagrammiChallengePayload = {
	targetWord: 'LUNA',
	tiles: ['N', 'A', 'L', 'U'],
	translation: 'moon',
	definition: 'Satellite naturale della Terra',
	category: 'natura',
	durationSeconds: 90,
};

const terminalContext = {
	challengeId: makeChallengeId('2026-01-26'),
	puzzleKey: 'anagrammi',
	attemptKind: 'official',
	attemptId: 'anagrammi-official-1',
	terminalEventId: 'anagrammi-terminal-1',
} as const;

describe('anagrammi daily challenge adapter', () => {
	it('preserves canonical target and tile order from the challenge payload', () => {
		const now = 1_000;

		const state = createAnagrammiChallengeState(challengePayload, now);

		expect(state.round).toEqual({
			targetWord: 'LUNA',
			tiles: ['N', 'A', 'L', 'U'],
			translation: 'moon',
			definition: 'Satellite naturale della Terra',
			category: 'natura',
		});
		expect(state.deadline).toBe(now + 90_000);
	});

	it('does not call Math.random while creating challenge-mode state', () => {
		const random = vi.spyOn(Math, 'random').mockImplementation(() => {
			throw new Error('challenge mode must not scramble');
		});

		try {
			expect(createAnagrammiChallengeState(challengePayload, 1_000).round.tiles).toEqual(['N', 'A', 'L', 'U']);
		} finally {
			random.mockRestore();
		}
	});

	it('rejects challenge tiles that are not a permutation of the target', () => {
		expect(() => createAnagrammiChallengeState({ ...challengePayload, tiles: ['L', 'U', 'N', 'E'] }, 1_000)).toThrow('anagrammi invalid tiles');
	});

	it('keeps wrong guess, hint, and challenge scoring behavior intact', () => {
		const state = createAnagrammiChallengeState({ ...challengePayload, tiles: ['A', 'L', 'U', 'N'], durationSeconds: 60 }, 1_000);
		const pickedA = anagrammiReducer(state, { type: 'tap-tile', index: 0 });
		const pickedAl = anagrammiReducer(pickedA, { type: 'tap-tile', index: 1 });
		const pickedAlu = anagrammiReducer(pickedAl, { type: 'tap-tile', index: 2 });
		const wrongGuess = anagrammiReducer(pickedAlu, { type: 'tap-tile', index: 3 });

		const afterWrongSubmit = anagrammiReducer(wrongGuess, { type: 'submit', now: 1_000 });
		const afterHint = anagrammiReducer(afterWrongSubmit, { type: 'hint' });
		const pickedLu = anagrammiReducer(afterHint, { type: 'type-letter', letter: 'U' });
		const pickedLun = anagrammiReducer(pickedLu, { type: 'type-letter', letter: 'N' });
		const pickedLuna = anagrammiReducer(pickedLun, { type: 'type-letter', letter: 'A' });
		const afterCorrectSubmit = anagrammiReducer(pickedLuna, { type: 'submit', now: 1_000 });

		expect(afterWrongSubmit.picked).toEqual([]);
		expect(afterHint.picked).toEqual([1]);
		expect(afterHint.hintsUsed).toBe(1);
		expect(afterCorrectSubmit.status).toBe('correct');
		expect(afterCorrectSubmit.score).toBe(47);
	});

	it('serializes explicit skip and giveUp terminal reasons', () => {
		const skipResult = dailyPuzzleAdapters.anagrammi.handleTerminal('skip', terminalContext);
		const giveUpResult = dailyPuzzleAdapters.anagrammi.handleTerminal('giveUp', { ...terminalContext, terminalEventId: 'anagrammi-terminal-2' });

		expect(JSON.parse(JSON.stringify(skipResult))).toMatchObject({ puzzleKey: 'anagrammi', reason: 'skip' });
		expect(JSON.parse(JSON.stringify(giveUpResult))).toMatchObject({ puzzleKey: 'anagrammi', reason: 'giveUp' });
	});

	it('keeps standalone random progress separate from challenge summaries', () => {
		const state = createAnagrammiChallengeState(challengePayload, 1_000);
		const challengeSummary = createAnagrammiChallengeSummary(state, 'skip');

		expect(parseSavedProgress(challengeSummary)).toBeNull();
		expect(parseSavedProgress({ score: 12, streak: 3 })).toEqual({ score: 12, streak: 3 });
	});

	it('builds a serializable challenge completion summary', () => {
		const state = createAnagrammiChallengeState(challengePayload, 1_000);
		const summary = createAnagrammiChallengeSummary({ ...state, score: 52, status: 'correct' }, 'win');

		expect(JSON.parse(JSON.stringify(summary))).toEqual({
			puzzleKey: 'anagrammi',
			status: 'correct',
			terminalReason: 'win',
			targetWord: 'LUNA',
			tiles: ['N', 'A', 'L', 'U'],
			translation: 'moon',
			definition: 'Satellite naturale della Terra',
			category: 'natura',
			score: 52,
			hintsUsed: 0,
			durationSeconds: 90,
		});
	});
});
