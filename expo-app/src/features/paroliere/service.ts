import {
	endParoliereActivity,
	startParoliereActivity,
	updateParoliereActivity,
	type ParoliereActivityState,
} from '@/lib/live-activity';

import { isValidWord } from './dictionary';

export type PathCell = { row: number; col: number };
export type ParoliereGameState = 'setup' | 'playing' | 'finished';

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

export const GRID_SIZE = 4;
const GAME_DURATION = 180; // seconds
const ACTIVITY_UPDATE_MS = 15_000;

// Italian letter frequency distribution.
const ITALIAN_LETTERS = 'AAAAEEEEIIIOOOUUULLLNNNRRRSSSTTTCCDDFGGMPBVZQHJ';

function generateRandomGrid(): string[][] {
	return Array.from({ length: GRID_SIZE }, () =>
		Array.from(
			{ length: GRID_SIZE },
			() => ITALIAN_LETTERS[Math.floor(Math.random() * ITALIAN_LETTERS.length)],
		),
	);
}

/** Longer words are worth more: 3=1, 4=2, 5=4, 6=6, 7+=10. */
export function wordPoints(length: number): number {
	if (length <= 3) return 1;
	if (length === 4) return 2;
	if (length === 5) return 4;
	if (length === 6) return 6;
	return 10;
}

function initialState(): ParoliereState {
	return {
		grid: generateRandomGrid(),
		foundWords: [],
		currentPath: [],
		currentWord: '',
		score: 0,
		timeLeft: GAME_DURATION,
		gameState: 'setup',
		lastOutcome: null,
	};
}

/**
 * One instance per screen mount (no module singleton, so a stale 'finished'
 * state can never greet the next visit). Owns the wall-clock countdown and
 * the Live Activity lifecycle; consumed via subscribe/getState.
 */
export class ParoliereService {
	private state = initialState();
	private listeners = new Set<() => void>();
	private timer: ReturnType<typeof setInterval> | null = null;
	private deadline = 0;
	private lastActivityPush = 0;
	private outcomeNonce = 0;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getState = (): ParoliereState => this.state;

	startGame = (): void => {
		this.stopTimer();
		this.deadline = Date.now() + GAME_DURATION * 1000;
		this.set({ ...initialState(), gameState: 'playing' });
		this.lastActivityPush = Date.now();
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
		if (s.currentPath.some((c) => c.row === cell.row && c.col === cell.col)) return;
		const last = s.currentPath[s.currentPath.length - 1];
		if (Math.abs(last.row - cell.row) > 1 || Math.abs(last.col - cell.col) > 1) return;
		const currentPath = [...s.currentPath, cell];
		this.set({
			...s,
			currentPath,
			currentWord: currentPath.map((c) => s.grid[c.row][c.col]).join(''),
		});
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
		this.finish(this.state.timeLeft);
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
			this.finish(0);
			return;
		}
		if (remaining !== this.state.timeLeft) this.set({ ...this.state, timeLeft: remaining });
		if (Date.now() - this.lastActivityPush >= ACTIVITY_UPDATE_MS) {
			this.lastActivityPush = Date.now();
			updateParoliereActivity(this.activityState());
		}
	};

	private finish(timeLeft: number): void {
		this.stopTimer();
		this.set({
			...this.state,
			timeLeft,
			gameState: 'finished',
			currentPath: [],
			currentWord: '',
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
