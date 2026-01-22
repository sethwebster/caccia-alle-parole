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

	let state: WordleState = {
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
					state = {
						...state,
						...parsed,
						guesses: parsed.guesses || []
					};
				}
			} catch (e) {
				console.error('Failed to parse saved state', e);
			}
		}
	}

	const store = writable<WordleState>(state);
	const { subscribe, set } = store;

	function save(newState: WordleState) {
		if (browser) {
			localStorage.setItem('wordleGameState', JSON.stringify({
				...newState,
				guesses: newState.guesses
			}));
		}
	}

	function updateState(newState: WordleState) {
		state = newState;
		set(newState);
	}

	return {
		subscribe,
		addLetter: (letter: string) => {
			if (state.gameState !== 'playing' || state.currentGuess.length >= 5) return;
			const newState = {
				...state,
				currentGuess: state.currentGuess + letter
			};
			updateState(newState);
		},
		deleteLetter: () => {
			if (state.gameState !== 'playing') return;
			const newState = {
				...state,
				currentGuess: state.currentGuess.slice(0, -1)
			};
			updateState(newState);
		},
		submitGuess: () => {
			if (state.gameState !== 'playing' || state.currentGuess.length !== 5) return;

			const guess = state.currentGuess.toUpperCase();

			// Validate word - validWords is a Set of uppercase words
			if (!validWords.has(guess)) {
				return; // Invalid word - could add toast notification
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
			updateState(newState);
		},
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
			updateState(newState);
		}
	};
}

export const wordleStore = createWordleStore();
