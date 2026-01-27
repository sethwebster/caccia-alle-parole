import { writable } from 'svelte/store';
import { wordDatabase } from '$lib/data/word-data';

export type GameState = 'playing' | 'correct' | 'skipped';

type AnagrammiStore = {
	targetWord: string;
	scrambledWord: string;
	currentGuess: string;
	translation: string;
	definition: string;
	category: string;
	score: number;
	streak: number;
	hintsUsed: number;
	gameState: GameState;
	timeLeft: number;
};

const GAME_DURATION = 60; // 1 minute per word

function getRandomWord() {
	const categories = Object.keys(wordDatabase);
	const category = categories[Math.floor(Math.random() * categories.length)];
	const words = wordDatabase[category as keyof typeof wordDatabase];
	const wordObj = words[Math.floor(Math.random() * words.length)];

	return {
		word: wordObj.word.toUpperCase(),
		translation: wordObj.translation,
		definition: wordObj.definition,
		category
	};
}

function scrambleWord(word: string): string {
	const letters = word.split('');
	for (let i = letters.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[letters[i], letters[j]] = [letters[j], letters[i]];
	}
	// Make sure it's actually scrambled
	const scrambled = letters.join('');
	return scrambled === word ? scrambleWord(word) : scrambled;
}

function createStore() {
	const initialWord = getRandomWord();

	const { subscribe, set, update } = writable<AnagrammiStore>({
		targetWord: initialWord.word,
		scrambledWord: scrambleWord(initialWord.word),
		currentGuess: '',
		translation: initialWord.translation,
		definition: initialWord.definition,
		category: initialWord.category,
		score: 0,
		streak: 0,
		hintsUsed: 0,
		gameState: 'playing',
		timeLeft: GAME_DURATION
	});

	let timerInterval: number | null = null;

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			update(state => {
				if (state.timeLeft <= 1) {
					if (timerInterval) clearInterval(timerInterval);
					return { ...state, timeLeft: 0, gameState: 'skipped' };
				}
				return { ...state, timeLeft: state.timeLeft - 1 };
			});
		}, 1000);
	}

	startTimer();

	return {
		subscribe,

		addLetter: (letter: string) => {
			update(state => {
				if (state.gameState !== 'playing') return state;
				if (state.currentGuess.length >= state.targetWord.length) return state;
				return { ...state, currentGuess: state.currentGuess + letter };
			});
		},

		removeLetter: () => {
			update(state => {
				if (state.gameState !== 'playing') return state;
				return { ...state, currentGuess: state.currentGuess.slice(0, -1) };
			});
		},

		submitGuess: () => {
			update(state => {
				if (state.gameState !== 'playing') return state;
				if (state.currentGuess.length !== state.targetWord.length) return state;

				if (state.currentGuess === state.targetWord) {
					const timeBonus = Math.floor(state.timeLeft / 5);
					const basePoints = state.targetWord.length * 10;
					const streakBonus = state.streak * 5;
					const points = basePoints + timeBonus + streakBonus - (state.hintsUsed * 5);

					if (timerInterval) clearInterval(timerInterval);

					return {
						...state,
						score: state.score + Math.max(0, points),
						streak: state.streak + 1,
						gameState: 'correct'
					};
				} else {
					return { ...state, currentGuess: '' };
				}
			});
		},

		useHint: () => {
			update(state => {
				if (state.gameState !== 'playing') return state;
				if (state.hintsUsed >= 2) return state;

				// Reveal one correct letter position
				for (let i = 0; i < state.targetWord.length; i++) {
					if (i >= state.currentGuess.length || state.currentGuess[i] !== state.targetWord[i]) {
						return {
							...state,
							currentGuess: state.targetWord.substring(0, i + 1),
							hintsUsed: state.hintsUsed + 1
						};
					}
				}

				return state;
			});
		},

		nextWord: () => {
			const newWord = getRandomWord();
			update(state => ({
				targetWord: newWord.word,
				scrambledWord: scrambleWord(newWord.word),
				currentGuess: '',
				translation: newWord.translation,
				definition: newWord.definition,
				category: newWord.category,
				score: state.score,
				streak: state.gameState === 'correct' ? state.streak : 0,
				hintsUsed: 0,
				gameState: 'playing',
				timeLeft: GAME_DURATION
			}));

			startTimer();
		},

		skipWord: () => {
			if (timerInterval) clearInterval(timerInterval);
			update(state => ({
				...state,
				gameState: 'skipped',
				streak: 0
			}));
		},

		reset: () => {
			const newWord = getRandomWord();
			if (timerInterval) clearInterval(timerInterval);

			set({
				targetWord: newWord.word,
				scrambledWord: scrambleWord(newWord.word),
				currentGuess: '',
				translation: newWord.translation,
				definition: newWord.definition,
				category: newWord.category,
				score: 0,
				streak: 0,
				hintsUsed: 0,
				gameState: 'playing',
				timeLeft: GAME_DURATION
			});

			startTimer();
		}
	};
}

export const anagrammiStore = createStore();
