import { DailyAdapterValidationError, dailyPuzzleAdapters, type DailyAdapterInitialization, type DailyTerminalResult } from '@/features/daily/adapters';
import type { TerminalAttemptContext, TerminalReason } from '@/features/daily/types';

import { getDisplaySlots, MAX_LIVES, parseSavedRound, type ImpiccatoGameState, type ImpiccatoRound } from './logic';

export type DailyImpiccatoRound = {
	readonly initialization: DailyAdapterInitialization;
	readonly round: ImpiccatoRound;
};

export type DailyImpiccatoAttemptKind = TerminalAttemptContext['attemptKind'];

export type DailyImpiccatoSummary = {
	readonly puzzleKey: 'impiccato';
	readonly label: 'Il Palloncino';
	readonly attemptKind: DailyImpiccatoAttemptKind;
	readonly status: ImpiccatoGameState;
	readonly score: number;
	readonly completedUnits: number;
	readonly totalUnits: number;
	readonly wrongGuesses: number;
	readonly remainingLives: number;
	readonly reason?: Extract<TerminalReason, 'win' | 'loss'>;
};

export function initializeDailyImpiccatoRound(input: unknown): DailyImpiccatoRound {
	const spec = dailyPuzzleAdapters.impiccato.parseSpec(input);
	const initialization = dailyPuzzleAdapters.impiccato.initialize(spec);
	const round = parseSavedRound(initialization.state);
	if (round === null || round.remainingLives > MAX_LIVES) throw new DailyAdapterValidationError('impiccato', 'payload');
	return { initialization, round };
}

export function summarizeDailyImpiccatoRound(round: ImpiccatoRound, attemptKind: DailyImpiccatoAttemptKind): DailyImpiccatoSummary {
	const base = {
		puzzleKey: 'impiccato',
		label: 'Il Palloncino',
		attemptKind,
		status: round.gameState,
		score: round.score,
		completedUnits: completedUnits(round),
		totalUnits: guessableUnits(round),
		wrongGuesses: MAX_LIVES - round.remainingLives,
		remainingLives: round.remainingLives,
	} as const;
	switch (round.gameState) {
		case 'won':
			return { ...base, reason: 'win' };
		case 'lost':
			return { ...base, reason: 'loss' };
		case 'playing':
			return base;
	}
}

export function buildDailyImpiccatoTerminalResult(reason: TerminalReason, context: Partial<TerminalAttemptContext>): DailyTerminalResult {
	return dailyPuzzleAdapters.impiccato.handleTerminal(reason, context);
}

function guessableUnits(round: ImpiccatoRound): number {
	return getDisplaySlots(round).filter((slot) => slot.kind === 'hidden' || slot.kind === 'revealed').length;
}

function completedUnits(round: ImpiccatoRound): number {
	return getDisplaySlots(round).filter((slot) => slot.kind === 'revealed').length;
}
