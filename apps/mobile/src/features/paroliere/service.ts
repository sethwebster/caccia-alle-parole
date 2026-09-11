import { Observe } from 'expo-observe';

import type { TerminalAttemptContext, TerminalReason } from '@/features/daily/types';
import {
	endParoliereActivity,
	startParoliereActivity,
	updateParoliereActivity,
	type ParoliereActivityState,
} from '@/lib/live-activity';

import { isValidWord } from '@/lib/dictionary';

import { BOARD_SIZE, generateBoard } from './board-quality';

export type PathCell = { row: number; col: number };
export type ParoliereGameState = 'setup' | 'playing' | 'finished';
export type ParoliereChallengeTerminalReason = Extract<TerminalReason, 'loss' | 'skip' | 'giveUp'>;

/** Result of the last released path; `nonce` retriggers the pulse animation. */
export type SubmitOutcome = { word: string; valid: boolean; nonce: number };

export type ParoliereState = {
	grid: string[][];
	foundWords: string[];
	currentPath: PathCell[];
	currentWord: string;
	score: number;
	timeLeft: number;
	gameState: ParoliereGameState;
	lastOutcome: SubmitOutcome | null;
};

export type ParoliereChallengeConfig = {
	readonly context: TerminalAttemptContext;
	readonly durationSeconds: number;
	readonly grid: readonly (readonly string[])[];
	/** Epoch ms of the official attempt start: the countdown is anchored here so leaving and returning never refills the clock. */
	readonly startedAtMs?: number;
};

export type ParoliereServiceOptions = {
	readonly challenge?: ParoliereChallengeConfig;
};

export type ParoliereTerminalSummary = {
	readonly context: TerminalAttemptContext;
	readonly foundWords: readonly string[];
	readonly puzzleKey: 'paroliere';
	readonly reason: ParoliereChallengeTerminalReason;
	readonly score: number;
	readonly timeLeft: number;
	readonly totalWords: number;
};

export class ParoliereChallengeConfigError extends Error {
	readonly name = 'ParoliereChallengeConfigError';

	constructor(readonly field: 'context' | 'durationSeconds' | 'grid') {
		super(`paroliere invalid ${field}`);
	}
}

export const GRID_SIZE = BOARD_SIZE;
const GAME_DURATION = 180; // seconds
const ACTIVITY_UPDATE_MS = 15_000;

/** Longer words are worth more: 3=1, 4=2, 5=4, 6=6, 7+=10. */
export function wordPoints(length: number): number {
	if (length <= 3) return 1;
	if (length === 4) return 2;
	if (length === 5) return 4;
	if (length === 6) return 6;
	return 10;
}

function initialState(challenge: ParoliereChallengeConfig | null): ParoliereState {
	return {
		grid: challenge === null ? generateBoard() : copyGrid(challenge.grid),
		foundWords: [],
		currentPath: [],
		currentWord: '',
		score: 0,
		timeLeft: challenge === null ? GAME_DURATION : challengeRemainingSeconds(challenge),
		gameState: 'setup',
		lastOutcome: null,
	};
}

function challengeRemainingSeconds(challenge: ParoliereChallengeConfig): number {
	if (challenge.startedAtMs === undefined) return challenge.durationSeconds;
	const elapsed = Math.floor((Date.now() - challenge.startedAtMs) / 1000);
	return Math.max(0, challenge.durationSeconds - elapsed);
}

function copyGrid(grid: readonly (readonly string[])[]): string[][] {
	return grid.map((row) => [...row]);
}

function validateChallengeConfig(challenge: ParoliereChallengeConfig): void {
	if (challenge.context.puzzleKey !== 'paroliere') throw new ParoliereChallengeConfigError('context');
	if (!Number.isInteger(challenge.durationSeconds) || challenge.durationSeconds <= 0) throw new ParoliereChallengeConfigError('durationSeconds');
	if (challenge.startedAtMs !== undefined && (!Number.isFinite(challenge.startedAtMs) || challenge.startedAtMs <= 0)) throw new ParoliereChallengeConfigError('durationSeconds');
	if (challenge.grid.length !== GRID_SIZE) throw new ParoliereChallengeConfigError('grid');
	for (const row of challenge.grid) {
		if (row.length !== GRID_SIZE || row.some((cell) => !/^[A-ZÀ-Ù]$/.test(cell))) throw new ParoliereChallengeConfigError('grid');
	}
}

/**
 * One instance per screen mount (no module singleton, so a stale 'finished'
 * state can never greet the next visit). Owns the wall-clock countdown and
 * the Live Activity lifecycle; consumed via subscribe/getState.
 */
export class ParoliereService {
	private state: ParoliereState;
	private listeners = new Set<() => void>();
	private timer: ReturnType<typeof setInterval> | null = null;
	private deadline = 0;
	private lastActivityPush = 0;
	private outcomeNonce = 0;
	private terminalSummary: ParoliereTerminalSummary | null = null;
	private readonly challenge: ParoliereChallengeConfig | null;

	constructor(options: ParoliereServiceOptions = {}) {
		if (options.challenge) validateChallengeConfig(options.challenge);
		this.challenge = options.challenge ?? null;
		this.state = initialState(this.challenge);
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getState = (): ParoliereState => this.state;
	getTerminalSummary = (): ParoliereTerminalSummary | null => this.terminalSummary;

	startGame = (): void => {
		if (this.state.gameState === 'playing') endParoliereActivity(this.activityState());
		this.stopTimer();
		this.terminalSummary = null;
		const next = initialState(this.challenge);
		this.deadline = Date.now() + next.timeLeft * 1000;
		this.set({ ...next, gameState: 'playing' });
		this.lastActivityPush = Date.now();
		Observe.logEvent('paroliere.started');
		startParoliereActivity(this.activityState());
		// Countdown against a wall-clock deadline: throttled timers can't
		// pause the clock, ticks just re-derive the remaining seconds.
		this.timer = setInterval(this.tick, 500);
	};

	beginSelection = (cell: PathCell): void => {
		if (this.state.gameState !== 'playing') return;
		this.set({
			...this.state,
			currentPath: [cell],
			currentWord: this.state.grid[cell.row][cell.col],
			lastOutcome: null,
		});
	};

	extendSelection = (cell: PathCell): void => {
		const s = this.state;
		if (s.gameState !== 'playing' || s.currentPath.length === 0) return;
		const selectedIndex = s.currentPath.findIndex((c) => c.row === cell.row && c.col === cell.col);
		if (selectedIndex === s.currentPath.length - 1) return;
		if (selectedIndex >= 0) {
			const currentPath = s.currentPath.slice(0, selectedIndex + 1);
			this.set({ ...s, currentPath, currentWord: currentPath.map((c) => s.grid[c.row][c.col]).join('') });
			return;
		}
		const last = s.currentPath[s.currentPath.length - 1];
		const extension = pathBetween(last, cell);
		if (extension.length === 0 || extension.some((candidate) => s.currentPath.some((selected) => selected.row === candidate.row && selected.col === candidate.col))) return;
		const currentPath = [...s.currentPath, ...extension];
		this.set({ ...s, currentPath, currentWord: currentPath.map((c) => s.grid[c.row][c.col]).join('') });
	};

	/** Pointer released: score the path if it spells a new dictionary word, else clear. */
	release = (): void => {
		const s = this.state;
		const cleared = { currentPath: [], currentWord: '' };
		if (s.gameState !== 'playing' || s.currentWord.length < 3) {
			this.set({ ...s, ...cleared });
			return;
		}
		const word = s.currentWord;
		const valid = isValidWord(word) && !s.foundWords.includes(word);
		const lastOutcome: SubmitOutcome = { word, valid, nonce: ++this.outcomeNonce };
		if (!valid) {
			this.set({ ...s, ...cleared, lastOutcome });
			return;
		}
		this.set({
			...s,
			...cleared,
			lastOutcome,
			foundWords: [...s.foundWords, word],
			score: s.score + wordPoints(word.length),
		});
		this.lastActivityPush = Date.now();
		updateParoliereActivity(this.activityState());
	};

	/** Only a running game can finish — ending from 'setup' would show an empty results modal. */
	endGame = (): void => {
		if (this.state.gameState !== 'playing') return;
		this.finish(this.state.timeLeft, 'giveUp');
	};

	giveUp = (reason: Extract<TerminalReason, 'skip' | 'giveUp'>): ParoliereTerminalSummary | null => {
		if (this.state.gameState !== 'playing') return this.terminalSummary;
		this.finish(this.state.timeLeft, reason);
		return this.terminalSummary;
	};

	/** Screen unmounted: stop the clock and close the Live Activity. */
	destroy = (): void => {
		this.stopTimer();
		if (this.state.gameState === 'playing') endParoliereActivity(this.activityState());
	};

	private tick = (): void => {
		if (this.state.gameState !== 'playing') return;
		const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
		if (remaining <= 0) {
			this.finish(0, 'loss');
			return;
		}
		if (remaining !== this.state.timeLeft) this.set({ ...this.state, timeLeft: remaining });
		if (Date.now() - this.lastActivityPush >= ACTIVITY_UPDATE_MS) {
			this.lastActivityPush = Date.now();
			updateParoliereActivity(this.activityState());
		}
	};

	private finish(timeLeft: number, reason: ParoliereChallengeTerminalReason): void {
		this.stopTimer();
		const finished = {
			...this.state,
			timeLeft,
			gameState: 'finished' as const,
			currentPath: [],
			currentWord: '',
		};
		// Publish the summary BEFORE notifying: useSyncExternalStore re-renders
		// synchronously on set(), and the terminal recorder reads the summary in
		// that render. Notify-first left the daily challenge terminal unrecorded.
		this.terminalSummary = this.challenge === null ? null : {
			context: this.challenge.context,
			foundWords: [...finished.foundWords],
			puzzleKey: 'paroliere',
			reason,
			score: finished.score,
			timeLeft: finished.timeLeft,
			totalWords: finished.foundWords.length,
		};
		this.set(finished);
		Observe.logEvent('paroliere.finished', {
			attributes: { score: finished.score, words: finished.foundWords.length },
		});
		endParoliereActivity(this.activityState());
	}

	private stopTimer(): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private set(next: ParoliereState): void {
		this.state = next;
		for (const listener of this.listeners) listener();
	}

	private activityState(): ParoliereActivityState {
		return {
			secondsLeft: this.state.timeLeft,
			score: this.state.score,
			wordsFound: this.state.foundWords.length,
		};
	}
}

/** Restores straight cells skipped by sparse pointer updates, especially on fast diagonals. */
function pathBetween(start: PathCell, end: PathCell): PathCell[] {
	const rowDelta = end.row - start.row;
	const colDelta = end.col - start.col;
	const rowDistance = Math.abs(rowDelta);
	const colDistance = Math.abs(colDelta);
	const steps = Math.max(rowDistance, colDistance);
	if (steps === 0) return [];
	if (rowDistance !== 0 && colDistance !== 0 && rowDistance !== colDistance) return [];
	const rowStep = Math.sign(rowDelta);
	const colStep = Math.sign(colDelta);
	return Array.from({ length: steps }, (_, index) => ({
		row: start.row + rowStep * (index + 1),
		col: start.col + colStep * (index + 1),
	}));
}
