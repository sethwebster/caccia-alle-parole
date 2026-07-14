import { Observe } from 'expo-observe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeChallengeId } from './date';
import { logDailyChallengeCompleted, logDailyChallengeStarted, logDailyPuzzleEnded, logDailyShare, logDailyThemeAnswered } from './daily-observe';

vi.mock('expo-observe', () => ({ Observe: { logEvent: vi.fn() } }));

beforeEach(() => {
	vi.mocked(Observe.logEvent).mockClear();
});

describe('Daily Challenge Observe events', () => {
	it('logs start end completion theme and share events with stable attributes', () => {
		// Given
		const challengeId = makeChallengeId('2026-07-09');

		// When
		logDailyChallengeStarted({ challengeId, puzzleKey: 'parola', mode: 'official' });
		logDailyChallengeStarted({ challengeId, puzzleKey: 'parola', mode: 'replay' });
		logDailyPuzzleEnded({ challengeId, puzzleKey: 'parola', mode: 'official', reason: 'win' });
		logDailyChallengeCompleted({ challengeId, wins: 5, streak: 3 });
		logDailyThemeAnswered({ challengeId, correct: true });
		logDailyShare({ challengeId, wins: 5, streak: 3 });

		// Then
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.started', { attributes: { challengeId, puzzleKey: 'parola' } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.replay_started', { attributes: { challengeId, puzzleKey: 'parola' } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.puzzle_ended', { attributes: { challengeId, puzzleKey: 'parola', mode: 'official', reason: 'win' } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.completed', { attributes: { challengeId, wins: 5, streak: 3 } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.theme_answered', { attributes: { challengeId, correct: true } });
		expect(Observe.logEvent).toHaveBeenCalledWith('daily_challenge.shared', { attributes: { challengeId, wins: 5, streak: 3 } });
	});
});
