declare const brand: unique symbol;

type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type LocalCivilDate = Brand<string, 'LocalCivilDate'>;
export type ChallengeId = Brand<LocalCivilDate, 'ChallengeId'>;
export type StreakDate = Brand<LocalCivilDate, 'StreakDate'>;
export type CatalogEpoch = Brand<string, 'CatalogEpoch'>;
export type CatalogVersion = Brand<string, 'CatalogVersion'>;
export type ReleaseBaseChallengeId = Brand<ChallengeId, 'ReleaseBaseChallengeId'>;

export const CANONICAL_PUZZLE_KEYS = ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const;
export type DailyPuzzleKey = (typeof CANONICAL_PUZZLE_KEYS)[number];

export const CANONICAL_PUZZLE_LABELS = {
	parola: 'Paròle',
	caccia: 'Caccia alle Paròle',
	paroliere: 'Paroliere+',
	impiccato: 'Il Palloncino',
	anagrammi: 'Anagrammi+',
} as const satisfies Record<DailyPuzzleKey, string>;

export const TERMINAL_REASONS = ['win', 'loss', 'skip', 'giveUp'] as const;
export type TerminalReason = (typeof TERMINAL_REASONS)[number];

export type TerminalAttemptContext = {
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly attemptKind: 'official' | 'replay';
	readonly attemptId: string;
	readonly terminalEventId: string;
};

export type ChallengeSource =
	| { readonly kind: 'bundledCatalog'; readonly epoch: CatalogEpoch; readonly version: CatalogVersion }
	| { readonly kind: 'generatedPreview'; readonly label: string };

export type DailyPuzzleSpec = {
	readonly key: DailyPuzzleKey;
	readonly label: string;
	readonly themeQuiz: ThemeQuizData;
};

export type DailyChallengeBundle = {
	readonly challengeId: ChallengeId;
	readonly streakDate: StreakDate;
	readonly source: ChallengeSource;
	readonly puzzles: readonly DailyPuzzleSpec[];
	readonly releaseBaseChallengeId: ReleaseBaseChallengeId;
};

export type OfficialAttempt = {
	readonly kind: 'official';
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly attemptId: string;
	readonly status: ChallengeStatus;
};

export type ReplayAttempt = {
	readonly kind: 'replay';
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly attemptId: string;
	readonly replayOfAttemptId: string;
	readonly status: ChallengeStatus;
};

export type ChallengeStatus =
	| { readonly kind: 'notStarted' }
	| { readonly kind: 'inProgress' }
	| { readonly kind: 'terminal'; readonly reason: TerminalReason; readonly context: TerminalAttemptContext };

export type SupportedDateRange = {
	readonly start: ChallengeId;
	readonly endInclusive: ChallengeId;
};

export type ThemeQuizData = {
	readonly prompt: string;
	readonly choices: readonly string[];
	readonly answerIndex: number;
};

export type OfficialStreakEligibilityInput = {
	readonly challengeId: ChallengeId;
	readonly startedAt: Date;
	readonly completedAt: Date;
	readonly creditedChallengeIds: readonly ChallengeId[];
	readonly creditedStreakDates: readonly StreakDate[];
};

export type OfficialStreakEligibility =
	| { readonly kind: 'credit'; readonly challengeId: ChallengeId; readonly streakDate: StreakDate }
	| {
			readonly kind: 'archiveOnly';
			readonly reason: 'completedAfterReleaseDay';
			readonly challengeId: ChallengeId;
			readonly completionStreakDate: StreakDate;
	  }
	| { readonly kind: 'archiveOnly'; readonly reason: 'challengeAlreadyCredited'; readonly challengeId: ChallengeId }
	| { readonly kind: 'archiveOnly'; readonly reason: 'streakDateAlreadyCredited'; readonly streakDate: StreakDate };
