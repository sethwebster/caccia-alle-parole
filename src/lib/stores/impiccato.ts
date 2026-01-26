import { writable } from 'svelte/store';
import { wordDatabase } from '$lib/data/word-data';

export type GameState = 'playing' | 'won' | 'lost';

type ImpiccatoStore = {
	targetWord: string;
	targetCategory: string;
	targetTranslation: string;
	targetDefinition: string;
	guessedLetters: Set<string>;
	remainingLives: number;
	gameState: GameState;
	score: number;
};

const MAX_LIVES = 6;

function getRandomWord() {
	const categories = Object.keys(wordDatabase);
	const category = categories[Math.floor(Math.random() * categories.length)];
	const words = wordDatabase[category as keyof typeof wordDatabase];
	const wordObj = words[Math.floor(Math.random() * words.length)];

	return {
		word: wordObj.word.toUpperCase(),
		category,
		translation: wordObj.translation,
		definition: wordObj.definition
	};
}

function createStore() {
	const initialWord = getRandomWord();

	const { subscribe, set, update } = writable<ImpiccatoStore>({
		targetWord: initialWord.word,
		targetCategory: initialWord.category,
		targetTranslation: initialWord.translation,
		targetDefinition: initialWord.definition,
		guessedLetters: new Set(),
		remainingLives: MAX_LIVES,
		gameState: 'playing',
		score: 0
	});

	return {
		subscribe,

		guessLetter: (letter: string) => {
			update(state => {
				if (state.gameState !== 'playing') return state;

				const upperLetter = letter.toUpperCase();

				if (state.guessedLetters.has(upperLetter)) return state;

				const newGuessedLetters = new Set([...state.guessedLetters, upperLetter]);

				// Check if letter is in word
				const isCorrect = state.targetWord.includes(upperLetter);
				const newLives = isCorrect ? state.remainingLives : state.remainingLives - 1;

				// Check win condition
				const allLettersGuessed = state.targetWord.split('').every(l =>
					newGuessedLetters.has(l) || l === ' ' || l === '-' || l === "'"
				);

				let newState: GameState = 'playing';
				let newScore = state.score;

				if (allLettersGuessed) {
					newState = 'won';
					newScore = state.score + (state.targetWord.length * 10) + (newLives * 5);
				} else if (newLives <= 0) {
					newState = 'lost';
				}

				return {
					...state,
					guessedLetters: newGuessedLetters,
					remainingLives: newLives,
					gameState: newState,
					score: newScore
				};
			});
		},

		newGame: () => {
			const newWord = getRandomWord();
			set({
				targetWord: newWord.word,
				targetCategory: newWord.category,
				targetTranslation: newWord.translation,
				targetDefinition: newWord.definition,
				guessedLetters: new Set(),
				remainingLives: MAX_LIVES,
				gameState: 'playing',
				score: 0
			});
		},

		continueGame: () => {
			update(state => {
				const newWord = getRandomWord();
				return {
					targetWord: newWord.word,
					targetCategory: newWord.category,
					targetTranslation: newWord.translation,
					targetDefinition: newWord.definition,
					guessedLetters: new Set(),
					remainingLives: MAX_LIVES,
					gameState: 'playing',
					score: state.score
				};
			});
		}
	};
}

export const impiccatoStore = createStore();
