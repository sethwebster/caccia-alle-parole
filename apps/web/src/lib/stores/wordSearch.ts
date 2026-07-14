import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { WordSearchState, Difficulty, PlacedWord } from '$lib/types';

const STORAGE_KEY = 'wordSearchGameState';

function normalizeWord(raw: string): string {
	return raw
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '')
		.toUpperCase();
}


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

// A saved game is only usable if its grid and word placements match the
// current schema; otherwise restoring it leaves an active game with an
// unplayable board.
function isValidSavedGame(parsed: unknown): parsed is WordSearchState {
	if (!parsed || typeof parsed !== 'object') return false;
	const p = parsed as Record<string, unknown>;
	if (!Array.isArray(p.words) || !Array.isArray(p.grid)) return false;
	if (!(p.foundWords instanceof Set)) return false;
	if (typeof p.score !== 'number') return false;

	// An active game needs a non-empty grid of letter cells and placed words.
	if (p.category != null || p.difficulty != null) {
		if (p.grid.length === 0 || p.words.length === 0) return false;
		const gridOk = p.grid.every(
			(row) =>
				Array.isArray(row) &&
				row.every((cell) => cell && typeof cell.letter === 'string')
		);
		const wordsOk = p.words.every(
			(w) => w && typeof w.word === 'string' && typeof w.points === 'number'
		);
		if (!gridOk || !wordsOk) return false;
		// Games generated before dedupe could contain the same word twice,
		// making them unwinnable — discard them.
		const normalized = p.words.map((w) => normalizeWord(w.word));
		return new Set(normalized).size === normalized.length;
	}

	return true;
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
				if (isValidSavedGame(parsed)) {
					Object.assign(initialState, parsed);
				} else {
					localStorage.removeItem(STORAGE_KEY);
				}
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
			const normalized = normalizeWord(word);
			const hasAlready = Array.from(state.foundWords).some((value) =>
				normalizeWord(value) === normalized
			);

			if (hasAlready) return state;

			const foundWord = state.words.find((w) =>
				normalizeWord(w.word) === normalized
			);
			const points = foundWord ? foundWord.points : 0;

			const canonicalWord = foundWord ? foundWord.word : word;
			const newState = {
				...state,
				foundWords: new Set([...state.foundWords, canonicalWord]),
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
