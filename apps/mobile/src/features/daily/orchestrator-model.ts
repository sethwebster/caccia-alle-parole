import type { DailyCatalogBundle, DailyCatalogResolution } from './catalog';
import type { DailyChallengeProgressRecord, DailyProgress, ProgressError } from './progress-model';
import type { ChallengeId, DailyPuzzleKey, TerminalAttemptContext, TerminalReason } from './types';

export const ACTIVE_ATTEMPT_STATE_KIND = 'daily-orchestrator-active-attempt-v1';

export type DailyChallengePhase = 'notStarted' | 'inProgress' | 'completedOfficial';
export type ThemeGateState = 'locked' | 'unlocked';

export type PuzzleRuntimeStatus =
	| { readonly kind: 'notStarted' }
	| { readonly kind: 'inProgress'; readonly context: TerminalAttemptContext }
	| { readonly kind: 'terminal'; readonly reason: TerminalReason; readonly context: TerminalAttemptContext };

export type DailyPuzzleRuntime = {
	readonly key: DailyPuzzleKey;
	readonly label: string;
	readonly status: PuzzleRuntimeStatus;
};

export type ActiveDailyAttempt = {
	readonly context: TerminalAttemptContext;
	readonly startedAt: string;
};

export type PersistedActiveAttemptState = ActiveDailyAttempt & {
	readonly kind: typeof ACTIVE_ATTEMPT_STATE_KIND;
};

export type DailyChallengeReadySnapshot = {
	readonly kind: 'ready';
	readonly mode: 'official' | 'replay';
	readonly phase: DailyChallengePhase;
	readonly themeGate: ThemeGateState;
	readonly bundle: DailyCatalogBundle;
	readonly progress: DailyProgress;
	readonly record?: DailyChallengeProgressRecord;
	readonly puzzles: readonly DailyPuzzleRuntime[];
	readonly currentPuzzleKey?: DailyPuzzleKey;
	readonly nextPuzzleKey?: DailyPuzzleKey;
	readonly activeAttempt?: ActiveDailyAttempt;
};

export type DailyChallengeSnapshot =
	| DailyChallengeReadySnapshot
	| Extract<DailyCatalogResolution, { readonly kind: 'updateRequired' }>
	| { readonly kind: 'progressError'; readonly error: ProgressError }
	| { readonly kind: 'subscriptionRequired'; readonly challengeId: ChallengeId };

export type TerminalRecordResult =
	| { readonly kind: 'accepted'; readonly snapshot: DailyChallengeReadySnapshot }
	| { readonly kind: 'rejected'; readonly reason: 'attemptNotActive' | 'attemptMismatch' | 'progressError' };

export type ThemeAnswerRecordResult =
	| { readonly kind: 'accepted'; readonly snapshot: DailyChallengeReadySnapshot }
	| { readonly kind: 'rejected'; readonly reason: 'notCompleted' | 'replayMode' | 'alreadyAnswered' | 'answerOutOfRange' | 'progressError' };

export type StartAttemptInput = {
	readonly puzzleKey: DailyPuzzleKey;
	readonly now?: Date;
};
