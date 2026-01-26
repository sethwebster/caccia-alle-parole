import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { WordleState, WordleGuess, KeyboardState } from '$lib/types';
import { wordleWords } from '$lib/data/wordle-data';
import { validWords } from '$lib/data/wordle-valid-words';
import { toast } from '$lib/stores/toast';

const EPOCH_DATE = new Date('2026-01-26');
const MAX_GUESSES = 6;

// Linear Congruential Generator (LCG) for deterministic random number generation
// Uses parameters from Numerical Recipes: a=1664525, c=1013904223, m=2^32
class SeededRandom {
	private seed: number;
	private static readonly MODULUS = 2 ** 32; // 2^32 = 4294967296

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 1664525 + 1013904223) % SeededRandom.MODULUS;
		return this.seed / SeededRandom.MODULUS;
	}
}

// Fisher-Yates shuffle with a fixed seed for deterministic results
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
	const shuffled = [...array];
	const rng = new SeededRandom(seed);
	
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Create a shuffled word list using a fixed seed
// This ensures all users get the same shuffled order
const SHUFFLE_SEED = 42; // Fixed seed for consistency across all users
const shuffledWords = shuffleWithSeed(wordleWords, SHUFFLE_SEED);

function getTodayWord() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dayNumber = Math.floor((today.getTime() - EPOCH_DATE.getTime()) / (1000 * 60 * 60 * 24));
	return shuffledWords[dayNumber % shuffledWords.length];
}

function evaluateGuess(guess: string, target: string) {
	const result = [];
	const targetLetters = target.split('');
	const guessLetters = guess.split('');
	const used = new Array(target.length).fill(false);

	// First pass: mark correct positions
	for (let i = 0; i < guessLetters.length; i++) {
		if (guessLetters[i] === targetLetters[i]) {
			result[i] = { letter: guessLetters[i], status: 'correct' as const };
			used[i] = true;
		}
	}

	// Second pass: mark present letters
	for (let i = 0; i < guessLetters.length; i++) {
		if (result[i]) continue;

		const letterIndex = targetLetters.findIndex((l, idx) => l === guessLetters[i] && !used[idx]);
		if (letterIndex !== -1) {
			result[i] = { letter: guessLetters[i], status: 'present' as const };
			used[letterIndex] = true;
		} else {
			result[i] = { letter: guessLetters[i], status: 'absent' as const };
		}
	}

	return result;
}

function createWordleStore() {
	const today = new Date().toISOString().split('T')[0];
	const todayWord = getTodayWord();

	const initialState: WordleState = {
		targetWord: todayWord.word.toUpperCase(),
		targetWordData: todayWord,
		guesses: [],
		currentGuess: '',
		gameState: 'playing',
		keyboardState: {},
		date: today
	};

	if (browser) {
		const saved = localStorage.getItem('wordleGameState');
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (parsed.date === today) {
					Object.assign(initialState, parsed);
					initialState.guesses = parsed.guesses || [];
				}
			} catch (e) {
				console.error('Failed to parse saved state', e);
			}
		}
	}

	const { subscribe, set, update } = writable<WordleState>(initialState);

	function save(state: WordleState) {
		if (browser) {
			localStorage.setItem('wordleGameState', JSON.stringify({
				...state,
				guesses: state.guesses
			}));
		}
	}

	return {
		subscribe,
		addLetter: (letter: string) => update(state => {
			if (state.gameState !== 'playing' || state.currentGuess.length >= 5) return state;
			const newState = { ...state, currentGuess: state.currentGuess + letter };
			return newState;
		}),
		deleteLetter: () => update(state => {
			if (state.gameState !== 'playing') return state;
			const newState = { ...state, currentGuess: state.currentGuess.slice(0, -1) };
			return newState;
		}),
		submitGuess: () => update(state => {
			if (state.gameState !== 'playing') return state;
			
			if (state.currentGuess.length !== 5) {
				toast('Not enough letters', 'default', 1000);
				return state;
			}

			const guess = state.currentGuess.toUpperCase();

			// Validate word - validWords is a Set of uppercase words
			if (!validWords.has(guess)) {
				toast('Not in word list', 'default', 1000);
				return state;
			}

			const result = evaluateGuess(guess, state.targetWord);
			const newGuess: WordleGuess = { word: guess, result };

			// Update keyboard state
			const newKeyboardState: KeyboardState = { ...state.keyboardState };
			result.forEach(({ letter, status }) => {
				const currentStatus = newKeyboardState[letter];
				if (status === 'correct' || !currentStatus || currentStatus === 'empty' || (status === 'present' && currentStatus === 'absent')) {
					newKeyboardState[letter] = status;
				}
			});

			const newGuesses = [...state.guesses, newGuess];
			const isWin = guess === state.targetWord;
			const isLoss = newGuesses.length >= MAX_GUESSES && !isWin;

			const newState = {
				...state,
				guesses: newGuesses,
				currentGuess: '',
				keyboardState: newKeyboardState,
				gameState: isWin ? 'won' as const : isLoss ? 'lost' as const : 'playing' as const
			};

			save(newState);
			return newState;
		}),
		reset: () => {
			const today = new Date().toISOString().split('T')[0];
			const todayWord = getTodayWord();
			const newState: WordleState = {
				targetWord: todayWord.word.toUpperCase(),
				targetWordData: todayWord,
				guesses: [],
				currentGuess: '',
				gameState: 'playing',
				keyboardState: {},
				date: today
			};
			save(newState);
			set(newState);
		}
	};
}

export const wordleStore = createWordleStore();
export const wordleUI = writable({ showModal: false });
