import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { WordSearchState, Difficulty, PlacedWord } from '$lib/types';

const STORAGE_KEY = 'wordSearchGameState';

function createEmptyState(): WordSearchState {
	return {
		category: null,
		difficulty: null,
		words: [],
		foundWords: new Set(),
		score: 0,
		grid: []
	};
}

function createWordSearchStore() {
	const initialState = createEmptyState();

	if (browser) {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				// Convert foundWords array back to Set
				if (parsed.foundWords && Array.isArray(parsed.foundWords)) {
					parsed.foundWords = new Set(parsed.foundWords);
				}
				Object.assign(initialState, parsed);
			} catch (e) {
				console.error('Failed to parse saved word search state', e);
			}
		}
	}

	const { subscribe, set, update } = writable<WordSearchState>(initialState);

	function save(state: WordSearchState) {
		if (browser) {
			// Convert Set to array for JSON serialization
			const serializable = {
				...state,
				foundWords: Array.from(state.foundWords)
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
		}
	}

	return {
		subscribe,

		setGame: (
			category: string,
			difficulty: Difficulty,
			words: PlacedWord[],
			grid: WordSearchState['grid']
		) => {
			const newState: WordSearchState = {
				category,
				difficulty,
				words,
				foundWords: new Set(),
				score: 0,
				grid
			};
			save(newState);
			set(newState);
		},

		markWordFound: (word: string) => update(state => {
			if (state.foundWords.has(word)) return state;

			const foundWord = state.words.find(w => w.word === word);
			const points = foundWord ? foundWord.points : 0;

			const newState = {
				...state,
				foundWords: new Set([...state.foundWords, word]),
				score: state.score + points
			};
			save(newState);
			return newState;
		}),

		reset: () => {
			const newState = createEmptyState();
			save(newState);
			set(newState);
		}
	};
}

export const wordSearchStore = createWordSearchStore();
