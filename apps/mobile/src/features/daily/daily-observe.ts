import { Observe } from 'expo-observe';

import type { ChallengeId, DailyPuzzleKey, TerminalReason } from './types';

export function logDailyChallengeStarted(input: { readonly challengeId: ChallengeId; readonly puzzleKey: DailyPuzzleKey; readonly mode: 'official' | 'replay' }) {
	Observe.logEvent(input.mode === 'replay' ? 'daily_challenge.replay_started' : 'daily_challenge.started', {
		attributes: { challengeId: input.challengeId, puzzleKey: input.puzzleKey },
	});
}

export function logDailyPuzzleEnded(input: { readonly challengeId: ChallengeId; readonly puzzleKey: DailyPuzzleKey; readonly mode: 'official' | 'replay'; readonly reason: TerminalReason }) {
	Observe.logEvent('daily_challenge.puzzle_ended', {
		attributes: { challengeId: input.challengeId, puzzleKey: input.puzzleKey, mode: input.mode, reason: input.reason },
	});
}

export function logDailyChallengeCompleted(input: { readonly challengeId: ChallengeId; readonly wins: number; readonly streak: number }) {
	Observe.logEvent('daily_challenge.completed', {
		attributes: { challengeId: input.challengeId, wins: input.wins, streak: input.streak },
	});
}

export function logDailyThemeAnswered(input: { readonly challengeId: ChallengeId; readonly correct: boolean }) {
	Observe.logEvent('daily_challenge.theme_answered', {
		attributes: { challengeId: input.challengeId, correct: input.correct },
	});
}

export function logDailyShare(input: { readonly challengeId: ChallengeId; readonly wins: number; readonly streak: number }) {
	Observe.logEvent('daily_challenge.shared', {
		attributes: { challengeId: input.challengeId, wins: input.wins, streak: input.streak },
	});
}
