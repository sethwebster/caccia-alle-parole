import { wordleWords } from '@/data/wordle-data';
import { isValidWord } from '@/lib/dictionary';
import { loadJSON, saveJSON } from '@/lib/storage';
import type { KeyboardState, LetterResult, Word, WordleState } from '@/lib/types';

export const MAX_GUESSES = 6;
export const WORD_LENGTH = 5;

const STORAGE_KEY = 'wordleGameState';
const EPOCH_DATE = new Date('2026-01-26');
const DAY_MS = 1000 * 60 * 60 * 24;
const SHUFFLE_SEED = 42; // Fixed seed so every player gets the same daily order.

/** Accent-insensitive comparison: 'À' must match 'A'. */
export function normalizeWord(s: string): string {
	return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Linear Congruential Generator (Numerical Recipes: a=1664525, c=1013904223, m=2^32).
class SeededRandom {
	private seed: number;
	private static readonly MODULUS = 2 ** 32;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 1664525 + 1013904223) % SeededRandom.MODULUS;
		return this.seed / SeededRandom.MODULUS;
	}
}

// Fisher-Yates with a fixed seed for deterministic results.
function shuffleWithSeed<T>(array: readonly T[], seed: number): T[] {
	const shuffled = [...array];
	const rng = new SeededRandom(seed);
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

const shuffledWords: Word[] = shuffleWithSeed(wordleWords, SHUFFLE_SEED);

/** Local midnight, matching the daily-word rollover clock. */
function localMidnightToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getPuzzleNumber(): number {
	return Math.floor((localMidnightToday().getTime() - EPOCH_DATE.getTime()) / DAY_MS) + 1;
}

/**
 * Local-calendar date string. Must use the same clock as the daily word,
 * which rolls over at local midnight — a UTC date would wipe saved games
 * mid-day and let players replay the same word.
 */
export function getLocalDateString(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayWord(): Word {
	const dayNumber = Math.floor((localMidnightToday().getTime() - EPOCH_DATE.getTime()) / DAY_MS);
	const len = shuffledWords.length;
	return shuffledWords[((dayNumber % len) + len) % len];
}

export function createTodayState(): WordleState {
	const todayWord = getTodayWord();
	return {
		targetWord: normalizeWord(todayWord.word.toUpperCase()),
		targetWordData: todayWord,
		guesses: [],
		currentGuess: '',
		gameState: 'playing',
		keyboardState: {},
		date: getLocalDateString(),
	};
}

export function evaluateGuess(guess: string, target: string): LetterResult[] {
	const result: LetterResult[] = [];
	const targetLetters = target.split('');
	const guessLetters = guess.split('');
	const used = new Array<boolean>(target.length).fill(false);

	// First pass: mark correct positions.
	for (let i = 0; i < guessLetters.length; i++) {
		if (guessLetters[i] === targetLetters[i]) {
			result[i] = { letter: guessLetters[i], status: 'correct' };
			used[i] = true;
		}
	}

	// Second pass: mark present letters.
	for (let i = 0; i < guessLetters.length; i++) {
		if (result[i]) continue;

		const letterIndex = targetLetters.findIndex((l, idx) => l === guessLetters[i] && !used[idx]);
		if (letterIndex !== -1) {
			result[i] = { letter: guessLetters[i], status: 'present' };
			used[letterIndex] = true;
		} else {
			result[i] = { letter: guessLetters[i], status: 'absent' };
		}
	}

	return result;
}

export function withLetter(state: WordleState, letter: string): WordleState {
	if (state.gameState !== 'playing' || state.currentGuess.length >= WORD_LENGTH) return state;
	return {
		...state,
		currentGuess: (state.currentGuess + normalizeWord(letter.toUpperCase())).slice(0, WORD_LENGTH),
	};
}

export function withoutLastLetter(state: WordleState): WordleState {
	if (state.gameState !== 'playing') return state;
	return { ...state, currentGuess: state.currentGuess.slice(0, -1) };
}

function applyGuess(state: WordleState, guess: string): WordleState {
	const result = evaluateGuess(guess, state.targetWord);

	// Keyboard precedence never downgrades: correct > present > absent.
	const keyboardState: KeyboardState = { ...state.keyboardState };
	for (const { letter, status } of result) {
		const current = keyboardState[letter];
		if (status === 'correct' || !current || current === 'empty' || (status === 'present' && current === 'absent')) {
			keyboardState[letter] = status;
		}
	}

	const guesses = [...state.guesses, { word: guess, result }];
	const isWin = guess === state.targetWord;
	const isLoss = guesses.length >= MAX_GUESSES && !isWin;

	return {
		...state,
		guesses,
		currentGuess: '',
		keyboardState,
		gameState: isWin ? 'won' : isLoss ? 'lost' : 'playing',
	};
}

export type SubmitOutcome =
	| { kind: 'ignored' }
	| { kind: 'rejected'; message: string }
	| { kind: 'played'; state: WordleState };

export function submitCurrentGuess(state: WordleState): SubmitOutcome {
	if (state.gameState !== 'playing') return { kind: 'ignored' };
	if (state.currentGuess.length !== WORD_LENGTH) {
		return { kind: 'rejected', message: 'Lettere insufficienti' };
	}
	const guess = normalizeWord(state.currentGuess.toUpperCase());
	if (!isValidWord(guess)) {
		return { kind: 'rejected', message: 'Parola non valida' };
	}
	return { kind: 'played', state: applyGuess(state, guess) };
}

export function buildShareText(state: WordleState): string {
	const emoji = state.guesses
		.map((guess) =>
			guess.result
				.map((r) => (r.status === 'correct' ? '🟩' : r.status === 'present' ? '🟨' : '⬜'))
				.join(''),
		)
		.join('\n');
	return `Caccia Paròle ${getPuzzleNumber()} ${state.gameState === 'won' ? state.guesses.length : 'X'}/6\n\n${emoji}`;
}

export async function persistState(state: WordleState): Promise<void> {
	await saveJSON(STORAGE_KEY, state);
}

/**
 * Rebuild today's state from the saved guess words. Evaluations, keyboard
 * state and outcome are re-derived against today's target, so a corrupt or
 * stale save can never produce an inconsistent board — anything suspicious
 * discards the whole save (returns null).
 */
export async function loadSavedState(): Promise<WordleState | null> {
	const raw = await loadJSON<unknown>(STORAGE_KEY);
	if (typeof raw !== 'object' || raw === null) return null;
	const saved = raw as Record<string, unknown>;
	if (saved.date !== getLocalDateString() || !Array.isArray(saved.guesses)) return null;

	let state = createTodayState();
	for (const entry of saved.guesses as unknown[]) {
		if (state.gameState !== 'playing') return null; // guesses past the end: corrupt
		const word = typeof entry === 'object' && entry !== null ? (entry as { word?: unknown }).word : undefined;
		if (typeof word !== 'string') return null;
		const guess = normalizeWord(word.toUpperCase());
		// Shape only: the guess was validated when it was played, and re-checking it
		// against a lexicon that moves with each Wiktionary refresh would silently
		// discard a finished game whenever a word left the dictionary.
		if (guess.length !== WORD_LENGTH) return null;
		state = applyGuess(state, guess);
	}

	if (
		state.gameState === 'playing' &&
		typeof saved.currentGuess === 'string' &&
		/^[A-Z]{0,5}$/.test(saved.currentGuess)
	) {
		state = { ...state, currentGuess: saved.currentGuess };
	}
	return state;
}
