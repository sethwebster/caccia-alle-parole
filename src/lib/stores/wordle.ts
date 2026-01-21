import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { WordleState, WordleGuess, KeyboardState } from '$lib/types';
import { wordleWords } from '$lib/data/wordle-data';
import { validWords } from '$lib/data/wordle-valid-words';

const EPOCH_DATE = new Date('2024-01-01');
const MAX_GUESSES = 6;

function getTodayWord() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dayNumber = Math.floor((today.getTime() - EPOCH_DATE.getTime()) / (1000 * 60 * 60 * 24));
	return wordleWords[dayNumber % wordleWords.length];
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
		console.log('[Wordle] Initializing store for date:', today);
		console.log('[Wordle] Saved state:', saved);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				console.log('[Wordle] Parsed state:', parsed);
				if (parsed.date === today) {
					console.log('[Wordle] Date matches, restoring saved state');
					Object.assign(initialState, parsed);
					initialState.guesses = parsed.guesses || [];
				} else {
					console.log('[Wordle] Date mismatch, using fresh state');
				}
			} catch (e) {
				console.error('Failed to parse saved state', e);
			}
		}
		console.log('[Wordle] Final initial state:', initialState);
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
			console.log('[Wordle] addLetter called:', letter, 'gameState:', state.gameState, 'currentGuess:', state.currentGuess);
			if (state.gameState !== 'playing' || state.currentGuess.length >= 5) {
				console.log('[Wordle] addLetter blocked');
				return state;
			}
			const newState = { ...state, currentGuess: state.currentGuess + letter };
			console.log('[Wordle] addLetter success, new currentGuess:', newState.currentGuess);
			return newState;
		}),
		deleteLetter: () => update(state => {
			if (state.gameState !== 'playing') return state;
			const newState = { ...state, currentGuess: state.currentGuess.slice(0, -1) };
			return newState;
		}),
		submitGuess: () => update(state => {
			console.log('[Wordle] submitGuess called, gameState:', state.gameState, 'currentGuess:', state.currentGuess);
			if (state.gameState !== 'playing' || state.currentGuess.length !== 5) {
				console.log('[Wordle] submitGuess blocked - gameState or length issue');
				return state;
			}

			const guess = state.currentGuess.toUpperCase();
			console.log('[Wordle] Validating guess:', guess);

			// Validate word - validWords is a Set of uppercase words
			if (!validWords.has(guess)) {
				console.log('[Wordle] Invalid word:', guess);
				return state; // Invalid word - could add toast notification
			}
			console.log('[Wordle] Valid word, processing guess');

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
