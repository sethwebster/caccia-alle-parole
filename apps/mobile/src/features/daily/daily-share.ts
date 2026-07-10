import type { DailyChallengeReadySnapshot, DailyPuzzleRuntime } from './orchestrator-model';
import { DAILY_COPY } from './daily-copy';
import { formatDailyChallengeDate, formatDailyDays, formatDailyWins } from './daily-format';
import { CANONICAL_PUZZLE_KEYS, type DailyPuzzleKey, type TerminalReason } from './types';

export type DailyResultShareCard = {
	readonly kind: 'available';
	readonly title: string;
	readonly body: string;
	readonly buttonLabel: string;
	readonly wins: number;
	readonly text: string;
};

export type DailyResultShareLockedCard = {
	readonly kind: 'locked';
	readonly title: string;
	readonly body: string;
	readonly buttonLabel: string;
};

export type DailyResultShareModel = DailyResultShareCard | DailyResultShareLockedCard;

const RESULT_GLYPHS = {
	win: '🟩',
	loss: '⬛',
	skip: '⬜',
	giveUp: '🟥',
} as const satisfies Record<TerminalReason, string>;

export function buildDailyResultShareModel(snapshot: DailyChallengeReadySnapshot, dailyUrl: string): DailyResultShareModel {
	if (snapshot.phase !== 'completedOfficial') {
		return {
			kind: 'locked',
			title: DAILY_COPY.share.lockedTitle,
			body: DAILY_COPY.share.lockedBody,
			buttonLabel: DAILY_COPY.share.lockedButton,
		};
	}

	const results = orderedTerminalResults(snapshot.puzzles);
	const wins = results.filter((result) => result === 'win').length;
	const streak = snapshot.progress.statsSummary.currentStreak;
	const date = formatDailyChallengeDate(snapshot.bundle.challengeId);
	const title = snapshot.mode === 'replay' ? DAILY_COPY.share.replayTitle : DAILY_COPY.share.officialTitle;
	const body = `${formatDailyWins(wins)} · serie ${formatDailyDays(streak)}`;
	return {
		kind: 'available',
		title,
		body,
		buttonLabel: DAILY_COPY.share.button,
		wins,
			text: [
				`${DAILY_COPY.share.publicTitle} · ${date}`,
				`${title}: ${formatDailyWins(wins)}`,
				results.map((result) => RESULT_GLYPHS[result]).join(''),
				`${DAILY_COPY.share.streak}: ${formatDailyDays(streak)}`,
				...themeResultLines(snapshot),
				`${DAILY_COPY.share.open}: ${dailyUrl}`,
			].join('\n'),
		};
}

function themeResultLines(snapshot: DailyChallengeReadySnapshot): readonly string[] {
	const answer = snapshot.record?.themeQuizResult;
	if (answer === undefined) return [];
	return [answer.answerIndex === snapshot.bundle.theme.answerIndex ? DAILY_COPY.share.themeCorrect : DAILY_COPY.share.themeIncorrect];
}

function orderedTerminalResults(puzzles: readonly DailyPuzzleRuntime[]): readonly TerminalReason[] {
	return CANONICAL_PUZZLE_KEYS.map((key) => terminalReasonForPuzzle(puzzles, key));
}

function terminalReasonForPuzzle(puzzles: readonly DailyPuzzleRuntime[], key: DailyPuzzleKey): TerminalReason {
	const puzzle = puzzles.find((candidate) => candidate.key === key);
	if (puzzle?.status.kind !== 'terminal') throw new DailyShareModelError(key);
	return puzzle.status.reason;
}

export class DailyShareModelError extends Error {
	readonly name = 'DailyShareModelError';

	constructor(readonly puzzleKey: DailyPuzzleKey) {
		super(`Missing terminal Daily Challenge result for ${puzzleKey}`);
	}
}
