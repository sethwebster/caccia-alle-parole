import type { DailyChallengeReadySnapshot, DailyChallengeSnapshot, DailyPuzzleRuntime, ThemeGateState } from './orchestrator-model';
import { DAILY_COPY, type DailyPuzzleStatusTone, type DailyStateCopy } from './daily-copy';
import { formatCatalogSource, formatCatalogVersion, formatCatalogWindow, formatDailyChallengeDate, formatDailyProgress, formatReplayCount } from './daily-format';
import { buildDailyResultShareModel, type DailyResultShareModel } from './daily-share';
import { dailyCatalogUpdateState, dailyProgressErrorState, dailySubscriptionRequiredState } from './daily-state-copy';
import { PRACTICE_ROUTES, type GameHref } from './route-policy';
import type { ChallengeId, ChallengeSource, DailyPuzzleKey } from './types';

export type DailyRoutePuzzleModel = {
	readonly key: DailyPuzzleKey;
	readonly href: GameHref;
	readonly icon: string;
	readonly label: string;
	readonly subtitle: string;
	readonly statusLabel: string;
	readonly statusTone: DailyPuzzleStatusTone;
	readonly canLaunch: boolean;
};

export type DailyRouteReadyModel = {
	readonly kind: 'ready';
	readonly mode: 'official' | 'replay';
	readonly phase: DailyChallengeReadySnapshot['phase'];
	readonly challengeId: ChallengeId;
	readonly dateLabel: string;
	readonly phaseLabel: string;
	readonly progressLabel: string;
	readonly progressValue: number;
	readonly progressMax: number;
	readonly activePuzzleKey?: DailyPuzzleKey;
	readonly currentPuzzleKey?: DailyPuzzleKey;
	readonly currentPuzzleHref?: GameHref;
	readonly currentActionLabel: string;
	readonly canGiveUp: boolean;
	readonly theme: DailyRouteThemeModel;
	readonly share: DailyResultShareModel;
	readonly stats: DailyRouteStatsModel;
	readonly catalog: DailyRouteCatalogModel;
	readonly replayBadge?: string;
	readonly puzzles: readonly DailyRoutePuzzleModel[];
};

export type DailyRouteModel =
	| DailyRouteReadyModel
	| ({ readonly kind: 'loading' } & DailyStateCopy)
	| ({ readonly kind: 'error' } & DailyStateCopy)
	| ({ readonly kind: 'subscriptionRequired' } & DailyStateCopy);

type DailyRouteThemeModel =
	| { readonly gate: 'locked'; readonly title: string; readonly body: string }
	| {
			readonly gate: 'unlocked';
			readonly status: 'unanswered';
			readonly title: string;
			readonly body: string;
			readonly prompt: string;
			readonly choices: readonly string[];
	  }
	| {
			readonly gate: 'unlocked';
			readonly status: 'answered';
			readonly title: string;
			readonly body: string;
			readonly prompt: string;
			readonly choices: readonly string[];
			readonly selectedAnswerIndex: number;
			readonly selectedChoice: string;
			readonly correctChoice: string;
			readonly isCorrect: boolean;
			readonly feedbackTitle: string;
			readonly explanation: string;
	  };

type DailyRouteCatalogModel = {
	readonly title: string;
	readonly versionLabel: string;
	readonly sourceLabel: string;
	readonly supportLabel: string;
};

type DailyRouteStatsModel = {
	readonly currentStreak: number;
	readonly maxStreak: number;
	readonly completedOfficialChallenges: number;
	readonly allWonOfficialChallenges: number;
	readonly perfectOfficialChallenges: number;
};

export function buildDailyRouteModel(snapshot: DailyChallengeSnapshot): DailyRouteModel {
	switch (snapshot.kind) {
		case 'ready':
			return buildReadyModel(snapshot);
		case 'progressError':
			return { kind: 'error', ...dailyProgressErrorState(snapshot.error) };
		case 'updateRequired':
			return { kind: 'error', ...dailyCatalogUpdateState(snapshot.reason) };
		case 'subscriptionRequired':
			return { kind: 'subscriptionRequired', ...dailySubscriptionRequiredState() };
	}
}

function buildReadyModel(snapshot: DailyChallengeReadySnapshot): DailyRouteReadyModel {
	const terminalCount = snapshot.puzzles.filter((puzzle) => puzzle.status.kind === 'terminal').length;
	const activePuzzleKey = snapshot.activeAttempt?.context.puzzleKey;
	const currentPuzzleKey = activePuzzleKey ?? snapshot.currentPuzzleKey;
	const currentPuzzleHref = hrefForPuzzle(currentPuzzleKey);
	return {
		kind: 'ready',
		mode: snapshot.mode,
		phase: snapshot.phase,
		challengeId: snapshot.bundle.challengeId,
		dateLabel: formatDailyChallengeDate(snapshot.bundle.challengeId),
		phaseLabel: phaseLabel(snapshot),
		progressLabel: formatDailyProgress(terminalCount, snapshot.puzzles.length),
		progressValue: terminalCount,
		progressMax: snapshot.puzzles.length,
		activePuzzleKey,
		currentPuzzleKey,
		currentPuzzleHref,
		currentActionLabel: currentActionLabel(snapshot),
		canGiveUp: snapshot.activeAttempt !== undefined,
		theme: themeModel(snapshot.themeGate, snapshot),
		share: buildDailyResultShareModel(snapshot, '/daily'),
		stats: statsModel(snapshot),
		catalog: catalogModel(snapshot.bundle.source, snapshot.bundle.catalogVersion, snapshot.bundle.supportedFromChallengeId, snapshot.bundle.supportedThroughChallengeId),
		replayBadge: replayBadge(snapshot),
		puzzles: snapshot.puzzles.map((puzzle) => puzzleModel(puzzle, currentPuzzleKey)),
	};
}

function statsModel(snapshot: DailyChallengeReadySnapshot): DailyRouteStatsModel {
	return {
		currentStreak: snapshot.progress.statsSummary.currentStreak,
		maxStreak: snapshot.progress.statsSummary.maxStreak,
		completedOfficialChallenges: snapshot.progress.statsSummary.completedOfficialChallenges,
		allWonOfficialChallenges: snapshot.progress.statsSummary.allWonOfficialChallenges,
		perfectOfficialChallenges: snapshot.progress.statsSummary.perfectOfficialChallenges,
	};
}

function puzzleModel(puzzle: DailyPuzzleRuntime, currentPuzzleKey: DailyPuzzleKey | undefined): DailyRoutePuzzleModel {
	const route = PRACTICE_ROUTES.find((candidate) => candidate.puzzleKey === puzzle.key);
	if (route === undefined) throw new DailyRouteModelError(puzzle.key);
	const status = puzzleStatus(puzzle, currentPuzzleKey);
	return {
		key: puzzle.key,
		href: route.href,
		icon: route.icon,
		label: puzzle.label,
		subtitle: route.subtitle,
		statusLabel: status.label,
		statusTone: status.tone,
		canLaunch: puzzle.status.kind !== 'terminal',
	};
}

function puzzleStatus(puzzle: DailyPuzzleRuntime, currentPuzzleKey: DailyPuzzleKey | undefined): { readonly label: string; readonly tone: DailyRoutePuzzleModel['statusTone'] } {
	switch (puzzle.status.kind) {
		case 'notStarted':
			return puzzle.key === currentPuzzleKey ? DAILY_COPY.puzzleStatus.next : DAILY_COPY.puzzleStatus.idle;
		case 'inProgress':
			return DAILY_COPY.puzzleStatus.active;
		case 'terminal':
			return DAILY_COPY.puzzleStatus[puzzle.status.reason];
	}
}

function currentActionLabel(snapshot: DailyChallengeReadySnapshot): string {
	if (snapshot.activeAttempt !== undefined) return DAILY_COPY.action.resume;
	if (snapshot.mode === 'replay' && snapshot.currentPuzzleKey !== undefined) return snapshot.phase === 'completedOfficial' ? DAILY_COPY.action.replayFirst : DAILY_COPY.action.replayStart;
	if (snapshot.mode === 'replay') return DAILY_COPY.action.replayDone;
	if (snapshot.phase === 'completedOfficial') return DAILY_COPY.action.officialDone;
	return snapshot.phase === 'notStarted' ? DAILY_COPY.action.start : DAILY_COPY.action.continue;
}

function themeModel(gate: ThemeGateState, snapshot: DailyChallengeReadySnapshot): DailyRouteThemeModel {
	if (gate === 'locked') {
		return { gate: 'locked', title: DAILY_COPY.theme.lockedTitle, body: DAILY_COPY.theme.lockedBody };
	}
	const result = snapshot.record?.themeQuizResult;
	const prompt = themePrompt(snapshot);
	if (result === undefined) {
		return {
			gate: 'unlocked',
			status: 'unanswered',
			title: DAILY_COPY.theme.unansweredTitle,
			body: DAILY_COPY.theme.unansweredBody,
			prompt,
			choices: snapshot.bundle.theme.choices,
		};
	}
	const selectedChoice = themeChoice(snapshot, result.answerIndex);
	const correctChoice = themeChoice(snapshot, snapshot.bundle.theme.answerIndex);
	const isCorrect = result.answerIndex === snapshot.bundle.theme.answerIndex;
	return {
		gate: 'unlocked',
		status: 'answered',
		title: `${DAILY_COPY.theme.answeredTitle}: ${snapshot.bundle.theme.label}`,
		body: isCorrect ? DAILY_COPY.theme.correctBody : DAILY_COPY.theme.incorrectBody,
		prompt,
		choices: snapshot.bundle.theme.choices,
		selectedAnswerIndex: result.answerIndex,
		selectedChoice,
		correctChoice,
		isCorrect,
		feedbackTitle: isCorrect ? DAILY_COPY.theme.correctFeedback : `${DAILY_COPY.theme.incorrectFeedback}: ${correctChoice}`,
		explanation: snapshot.bundle.theme.explanation,
	};
}

function themePrompt(snapshot: DailyChallengeReadySnapshot): string {
	const prompt = snapshot.bundle.puzzles[0]?.themeQuiz.prompt;
	if (prompt === undefined || prompt.trim().length === 0) throw new DailyRouteThemeMetadataError('prompt');
	return prompt;
}

function themeChoice(snapshot: DailyChallengeReadySnapshot, answerIndex: number): string {
	const choice = snapshot.bundle.theme.choices[answerIndex];
	if (choice === undefined) throw new DailyRouteThemeMetadataError(`choice:${answerIndex}`);
	return choice;
}

function catalogModel(source: ChallengeSource, catalogVersion: string, supportedFrom: string, supportedThrough: string): DailyRouteCatalogModel {
	return {
		title: DAILY_COPY.catalog.title,
		versionLabel: formatCatalogVersion(catalogVersion),
		sourceLabel: formatCatalogSource(source),
		supportLabel: formatCatalogWindow(supportedFrom, supportedThrough),
	};
}

function replayBadge(snapshot: DailyChallengeReadySnapshot): string | undefined {
	const count = snapshot.record?.replayAttempts.length ?? 0;
	if (snapshot.mode === 'replay') return DAILY_COPY.replayBadge.active;
	return count > 0 ? formatReplayCount(count) : undefined;
}

function hrefForPuzzle(puzzleKey: DailyPuzzleKey | undefined): GameHref | undefined {
	return PRACTICE_ROUTES.find((route) => route.puzzleKey === puzzleKey)?.href;
}

function phaseLabel(snapshot: DailyChallengeReadySnapshot): string {
	if (snapshot.mode === 'replay') return DAILY_COPY.phase.replay;
	switch (snapshot.phase) {
		case 'notStarted':
			return DAILY_COPY.phase.notStarted;
		case 'inProgress':
			return DAILY_COPY.phase.inProgress;
		case 'completedOfficial':
			return DAILY_COPY.phase.completedOfficial;
	}
}

export class DailyRouteModelError extends Error {
	readonly name = 'DailyRouteModelError';

	constructor(readonly puzzleKey: DailyPuzzleKey) {
		super(`Missing route for ${puzzleKey}`);
	}
}

export class DailyRouteThemeMetadataError extends Error {
	readonly name = 'DailyRouteThemeMetadataError';

	constructor(readonly field: string) {
		super(`Missing Daily Challenge theme metadata: ${field}`);
	}
}
