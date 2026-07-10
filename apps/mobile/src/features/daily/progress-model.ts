import { compareStreakDates, makeChallengeId, makeStreakDate } from './date';
import type { DailyCatalogBundle } from './catalog';
import type { ChallengeId, ChallengeSource, DailyPuzzleKey, StreakDate, TerminalReason } from './types';

export const DAILY_PROGRESS_KEY = 'daily-progress:v1';
export const DAILY_PROGRESS_QUARANTINE_KEY = 'daily-progress:v1:quarantine';
export const DAILY_PROGRESS_SCHEMA_VERSION = 1;

export type ProgressStorageAdapter = {
	readonly getItem: (key: string) => Promise<string | null>;
	readonly setItem: (key: string, value: string) => Promise<void>;
};

export type ProgressError =
	| { readonly kind: 'readFailed'; readonly message: string }
	| { readonly kind: 'writeFailed'; readonly message: string }
	| { readonly kind: 'verificationFailed'; readonly message: string }
	| { readonly kind: 'corruptRecord'; readonly message: string };

export type ProgressResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ProgressError };

export type TerminalProgressEvent = {
	readonly attemptId: string;
	readonly completedAt: string;
	readonly puzzleKey: DailyPuzzleKey;
	readonly reason: TerminalReason;
	readonly terminalEventId: string;
};

export type ReplayProgressAttempt = {
	readonly attemptId: string;
	readonly terminalEvents: readonly TerminalProgressEvent[];
};

export type PuzzleProgressSnapshot = {
	readonly puzzleKey: DailyPuzzleKey;
	readonly state: unknown;
	readonly updatedAt: string;
};

export type CompletionCreditRecord = {
	readonly challengeId: ChallengeId;
	readonly completedAt: string;
	readonly creditId: string;
	readonly streakDate: StreakDate;
};

export type ThemeQuizResult = {
	readonly answerIndex: number;
	readonly answeredAt: string;
	readonly eventId: string;
};

export type DailyChallengeProgressRecord = {
	readonly challengeId: ChallengeId;
	readonly source: ChallengeSource | null;
	readonly bundleSnapshot?: DailyCatalogBundle;
	readonly migrationStatus: 'fresh' | 'migrated' | 'recovery';
	readonly officialAttempt?: { readonly attemptId: string; readonly terminalEvents: readonly TerminalProgressEvent[] };
	readonly inProgressPuzzles: readonly PuzzleProgressSnapshot[];
	readonly replayAttempts: readonly ReplayProgressAttempt[];
	readonly themeQuizResult?: ThemeQuizResult;
};

export type DailyStatsSummary = {
	readonly allWonOfficialChallenges: number;
	readonly completedOfficialChallenges: number;
	readonly currentStreak: number;
	readonly maxStreak: number;
	readonly perfectOfficialChallenges: number;
	readonly totalOfficialTerminalEvents: number;
};

export type DailyProgress = {
	readonly schemaVersion: 1;
	readonly challenges: readonly DailyChallengeProgressRecord[];
	readonly credits: readonly CompletionCreditRecord[];
	readonly mutationEventIds: readonly string[];
	readonly statsSummary: DailyStatsSummary;
};

export type DailyProgressLoadState =
	| { readonly kind: 'ready'; readonly progress: DailyProgress }
	| { readonly kind: 'quarantined'; readonly message: string };

export type ArchiveState =
	| { readonly kind: 'missed'; readonly challengeId: ChallengeId }
	| { readonly kind: 'inProgress'; readonly challengeId: ChallengeId }
	| { readonly kind: 'completed'; readonly challengeId: ChallengeId }
	| { readonly kind: 'replayOnly'; readonly challengeId: ChallengeId; readonly replayCount: number };

export const emptyDailyProgress: DailyProgress = {
	schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION,
	challenges: [],
	credits: [],
	mutationEventIds: [],
	statsSummary: {
		allWonOfficialChallenges: 0,
		completedOfficialChallenges: 0,
		currentStreak: 0,
		maxStreak: 0,
		perfectOfficialChallenges: 0,
		totalOfficialTerminalEvents: 0,
	},
};

export function rebuildStats(progress: Omit<DailyProgress, 'statsSummary'>): DailyStatsSummary {
	const sortedCredits = [...progress.credits].sort((left, right) => String(left.streakDate).localeCompare(String(right.streakDate)));
	let currentStreak = 0;
	let maxStreak = 0;
	let previous: StreakDate | null = null;
	for (const credit of sortedCredits) {
		const comparison = previous === null ? 'gap' : compareStreakDates(previous, credit.streakDate);
		currentStreak = comparison === 'consecutive' ? currentStreak + 1 : 1;
		maxStreak = Math.max(maxStreak, currentStreak);
		previous = credit.streakDate;
	}
	const completedOfficialChallenges = progress.challenges.filter((record) => hasAllOfficialTerminalEvents(record)).length;
	const allWonOfficialChallenges = progress.challenges.filter(hasAllOfficialWins).length;
	const perfectOfficialChallenges = allWonOfficialChallenges;
	const totalOfficialTerminalEvents = progress.challenges.reduce(
		(total, record) => total + (record.officialAttempt?.terminalEvents.length ?? 0),
		0,
	);
	return {
		allWonOfficialChallenges,
		completedOfficialChallenges,
		currentStreak: sortedCredits.length === 0 ? 0 : currentStreak,
		maxStreak,
		perfectOfficialChallenges,
		totalOfficialTerminalEvents,
	};
}

export function hasAllOfficialTerminalEvents(record: DailyChallengeProgressRecord): boolean {
	const keys = new Set(record.officialAttempt?.terminalEvents.map((event) => event.puzzleKey) ?? []);
	return keys.size === 5;
}

function hasAllOfficialWins(record: DailyChallengeProgressRecord): boolean {
	const events = record.officialAttempt?.terminalEvents ?? [];
	return hasAllOfficialTerminalEvents(record) && events.every((event) => event.reason === 'win');
}

export function sortProgress(progress: DailyProgress): DailyProgress {
	return {
		...progress,
		challenges: [...progress.challenges].sort((left, right) => String(left.challengeId).localeCompare(String(right.challengeId))),
		credits: [...progress.credits].sort((left, right) => String(left.challengeId).localeCompare(String(right.challengeId))),
		mutationEventIds: [...progress.mutationEventIds].sort(),
	};
}

export function makeProgressReady(progress: Omit<DailyProgress, 'statsSummary'>): DailyProgress {
	return sortProgress({ ...progress, statsSummary: rebuildStats(progress) });
}

export function parseChallengeId(value: unknown): ChallengeId | null {
	if (typeof value !== 'string') return null;
	try {
		return makeChallengeId(value);
	} catch (error) {
		if (error instanceof Error) return null;
		throw error;
	}
}

export function parseStreakDate(value: unknown): StreakDate | null {
	if (typeof value !== 'string') return null;
	try {
		return makeStreakDate(value);
	} catch (error) {
		if (error instanceof Error) return null;
		throw error;
	}
}
