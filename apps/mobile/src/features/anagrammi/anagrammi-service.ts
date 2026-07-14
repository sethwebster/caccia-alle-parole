import { categories, getWordsByCategory } from '@/data/word-data';

export type RoundStatus = 'playing' | 'correct' | 'skipped';

export type Round = {
	/** Uppercased answer. */
	targetWord: string;
	/** Scrambled letters, one per tile; a permutation of targetWord. */
	tiles: string[];
	translation: string;
	definition: string;
	category: string;
};

export type AnagrammiState = {
	status: RoundStatus;
	round: Round;
	/** Tile indices picked so far, in order — the current guess. */
	picked: number[];
	score: number;
	streak: number;
	hintsUsed: number;
	/** Wall-clock ms timestamp when the current round expires. */
	deadline: number;
};

export type AnagrammiAction =
	| { type: 'tap-tile'; index: number }
	| { type: 'type-letter'; letter: string }
	| { type: 'backspace' }
	| { type: 'submit'; now: number }
	| { type: 'hint' }
	| { type: 'skip' }
	| { type: 'expire' }
	| { type: 'next'; round: Round; now: number }
	| { type: 'reset'; round: Round; now: number }
	| { type: 'hydrate'; score: number; streak: number; now: number };

export const ROUND_DURATION_MS = 60_000;
export const MAX_HINTS = 2;

/** Accent-insensitive form: an unaccented keystroke must match its accented letter. */
export const normalizeLetters = (s: string) =>
	s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function remainingSeconds(deadline: number, now: number): number {
	return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/**
 * Fisher-Yates shuffle that never returns the original order.
 * Uniform-letter words (e.g. "AAA") are returned as-is — they can't differ.
 */
export function scrambleWord(word: string): string[] {
	const letters = word.split('');
	if (new Set(letters).size <= 1) return letters;
	let scrambled: string[];
	do {
		scrambled = [...letters];
		for (let i = scrambled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
		}
	} while (scrambled.join('') === word);
	return scrambled;
}

/** Random single word (multi-word entries make broken anagrams) from a random category. */
export function pickRound(): Round {
	const category = categories[Math.floor(Math.random() * categories.length)];
	const words = getWordsByCategory(category).filter((w) => !w.word.includes(' '));
	const entry = words[Math.floor(Math.random() * words.length)];
	const word = entry.word.toUpperCase();
	return {
		targetWord: word,
		tiles: scrambleWord(word),
		translation: entry.translation,
		definition: entry.definition,
		category,
	};
}

export function guessFromPicked(round: Round, picked: number[]): string {
	return picked.map((i) => round.tiles[i]).join('');
}

/** Greedily map each prefix letter to an unused tile (tiles permute the target, so this always succeeds). */
function pickTilesForPrefix(tiles: string[], prefix: string): number[] {
	const picked: number[] = [];
	for (const letter of prefix) {
		const index = tiles.findIndex((tile, i) => tile === letter && !picked.includes(i));
		picked.push(index);
	}
	return picked;
}

export function createInitialState(): AnagrammiState {
	return {
		status: 'playing',
		round: pickRound(),
		picked: [],
		score: 0,
		streak: 0,
		hintsUsed: 0,
		deadline: Date.now() + ROUND_DURATION_MS,
	};
}

export function anagrammiReducer(state: AnagrammiState, action: AnagrammiAction): AnagrammiState {
	switch (action.type) {
		case 'tap-tile': {
			if (state.status !== 'playing') return state;
			if (state.picked.includes(action.index)) return state;
			if (state.picked.length >= state.round.targetWord.length) return state;
			return { ...state, picked: [...state.picked, action.index] };
		}
		case 'type-letter': {
			if (state.status !== 'playing') return state;
			if (state.picked.length >= state.round.targetWord.length) return state;
			const wanted = normalizeLetters(action.letter);
			const index = state.round.tiles.findIndex(
				(tile, i) => !state.picked.includes(i) && normalizeLetters(tile) === wanted,
			);
			if (index === -1) return state;
			return { ...state, picked: [...state.picked, index] };
		}
		case 'backspace': {
			if (state.status !== 'playing' || state.picked.length === 0) return state;
			return { ...state, picked: state.picked.slice(0, -1) };
		}
		case 'submit': {
			if (state.status !== 'playing') return state;
			const target = state.round.targetWord;
			const guess = guessFromPicked(state.round, state.picked);
			if (guess.length !== target.length) return state;
			if (normalizeLetters(guess) !== normalizeLetters(target)) {
				// Wrong: clear the guess and free every tile.
				return { ...state, picked: [] };
			}
			const timeBonus = Math.floor(remainingSeconds(state.deadline, action.now) / 5);
			const points = target.length * 10 + timeBonus + state.streak * 5 - state.hintsUsed * 5;
			return {
				...state,
				score: state.score + Math.max(0, points),
				streak: state.streak + 1,
				status: 'correct',
			};
		}
		case 'hint': {
			if (state.status !== 'playing' || state.hintsUsed >= MAX_HINTS) return state;
			const target = state.round.targetWord;
			const guess = guessFromPicked(state.round, state.picked);
			// Reveal the target prefix up to and including the first wrong/missing letter.
			for (let i = 0; i < target.length; i++) {
				if (i >= guess.length || guess[i] !== target[i]) {
					const prefix = target.substring(0, i + 1);
					return {
						...state,
						picked: pickTilesForPrefix(state.round.tiles, prefix),
						hintsUsed: state.hintsUsed + 1,
					};
				}
			}
			return state;
		}
		case 'skip': {
			if (state.status !== 'playing') return state;
			return { ...state, status: 'skipped', streak: 0 };
		}
		case 'expire': {
			if (state.status !== 'playing') return state;
			return { ...state, status: 'skipped' };
		}
		case 'next':
			return {
				...state,
				status: 'playing',
				round: action.round,
				picked: [],
				streak: state.status === 'correct' ? state.streak : 0,
				hintsUsed: 0,
				deadline: action.now + ROUND_DURATION_MS,
			};
		case 'reset':
			return {
				status: 'playing',
				round: action.round,
				picked: [],
				score: 0,
				streak: 0,
				hintsUsed: 0,
				deadline: action.now + ROUND_DURATION_MS,
			};
		case 'hydrate':
			// Restore persisted totals and start the clock from hydration time.
			return {
				...state,
				score: action.score,
				streak: action.streak,
				deadline: action.now + ROUND_DURATION_MS,
			};
	}
}

export type SavedProgress = { score: number; streak: number };

/** Validate persisted data; wrong shape => discard (never hydrate a broken game). */
export function parseSavedProgress(value: unknown): SavedProgress | null {
	if (typeof value !== 'object' || value === null) return null;
	const keys = Object.keys(value);
	if (keys.length !== 2 || !keys.includes('score') || !keys.includes('streak')) return null;
	const { score, streak } = value as Record<string, unknown>;
	if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return null;
	if (typeof streak !== 'number' || !Number.isFinite(streak) || streak < 0) return null;
	return { score: Math.floor(score), streak: Math.floor(streak) };
}
