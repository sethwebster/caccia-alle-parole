import { challengeIdForDate, streakDateForDate } from './date';
import type {
	DailyPuzzleKey,
	OfficialStreakEligibility,
	OfficialStreakEligibilityInput,
	TerminalAttemptContext,
	TerminalReason,
} from './types';

export function isTerminalReason(value: string): value is TerminalReason {
	switch (value) {
		case 'win':
		case 'loss':
		case 'skip':
		case 'giveUp':
			return true;
		default:
			return false;
	}
}

export function buildTerminalAttemptContext(context: TerminalAttemptContext): TerminalAttemptContext {
	return context;
}

export function isCompleteTerminalAttemptContext(
	context: Partial<TerminalAttemptContext>,
): context is TerminalAttemptContext {
	return (
		context.challengeId !== undefined &&
		isDailyPuzzleKey(context.puzzleKey) &&
		(context.attemptKind === 'official' || context.attemptKind === 'replay') &&
		context.attemptId !== undefined &&
		context.terminalEventId !== undefined
	);
}

export function evaluateOfficialStreakEligibility(input: OfficialStreakEligibilityInput): OfficialStreakEligibility {
	const completionStreakDate = streakDateForDate(input.completedAt);
	if (input.creditedChallengeIds.includes(input.challengeId)) {
		return { kind: 'archiveOnly', reason: 'challengeAlreadyCredited', challengeId: input.challengeId };
	}
	if (input.creditedStreakDates.includes(completionStreakDate)) {
		return { kind: 'archiveOnly', reason: 'streakDateAlreadyCredited', streakDate: completionStreakDate };
	}
	if (input.challengeId !== challengeIdForDate(input.completedAt)) {
		return {
			kind: 'archiveOnly',
			reason: 'completedAfterReleaseDay',
			challengeId: input.challengeId,
			completionStreakDate,
		};
	}
	return { kind: 'credit', challengeId: input.challengeId, streakDate: completionStreakDate };
}

function isDailyPuzzleKey(value: DailyPuzzleKey | undefined): value is DailyPuzzleKey {
	switch (value) {
		case 'parola':
		case 'caccia':
		case 'paroliere':
		case 'impiccato':
		case 'anagrammi':
			return true;
		default:
			return false;
	}
}
