import { getWordsByCategory } from '@/data/word-data';
import { generateGrid } from '@/lib/gridGenerator';
import { loadJSON, removeKey, saveJSON } from '@/lib/storage';
import type { Difficulty, WordSearchState } from '@/lib/types';

export const STORAGE_KEY = 'wordSearchGameState';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
	easy: 'Facile',
	medium: 'Medio',
	hard: 'Difficile',
};

/** Accent-insensitive, space-free, uppercase canonical form for comparisons. */
export function normalizeWord(raw: string): string {
	return raw
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '')
		.toUpperCase();
}

export function createEmptyState(): WordSearchState {
	return {
		category: null,
		difficulty: null,
		words: [],
		foundWords: new Set(),
		score: 0,
		grid: [],
	};
}

export function createGame(category: string, difficulty: Difficulty): WordSearchState | null {
	const words = getWordsByCategory(category);
	if (words.length === 0) return null;
	const { grid, placedWords } = generateGrid(words, difficulty);
	return {
		category,
		difficulty,
		words: placedWords,
		foundWords: new Set(),
		score: 0,
		grid,
	};
}

/**
 * Marks `word` as found (normalized dedupe) and adds its points; returns the
 * same state when the word is unknown or already found.
 */
export function markWordFound(state: WordSearchState, word: string): WordSearchState {
	const normalized = normalizeWord(word);
	const alreadyFound = Array.from(state.foundWords).some(
		(value) => normalizeWord(value) === normalized,
	);
	if (alreadyFound) return state;

	const placed = state.words.find((w) => normalizeWord(w.word) === normalized);
	if (!placed) return state;

	return {
		...state,
		foundWords: new Set([...state.foundWords, placed.word]),
		score: state.score + placed.points,
	};
}

type PersistedWordSearchState = Omit<WordSearchState, 'foundWords'> & { foundWords: string[] };

/**
 * A saved game is only usable if its grid and word placements match the
 * current schema; otherwise restoring it leaves an active game with an
 * unplayable board.
 */
function isValidSavedState(parsed: unknown): parsed is PersistedWordSearchState {
	if (!parsed || typeof parsed !== 'object') return false;
	const p = parsed as Record<string, unknown>;
	if (!Array.isArray(p.words) || !Array.isArray(p.grid)) return false;
	if (!Array.isArray(p.foundWords) || !p.foundWords.every((w) => typeof w === 'string')) {
		return false;
	}
	if (typeof p.score !== 'number') return false;

	// An active game needs a non-empty grid of letter cells and placed words.
	if (p.category != null || p.difficulty != null) {
		if (p.grid.length === 0 || p.words.length === 0) return false;
		const gridOk = p.grid.every(
			(row) => Array.isArray(row) && row.every((cell) => cell && typeof cell.letter === 'string'),
		);
		const wordsOk = p.words.every(
			(w) =>
				w &&
				typeof w.word === 'string' &&
				typeof w.points === 'number' &&
				Array.isArray(w.cells) &&
				w.cells.length > 0,
		);
		if (!gridOk || !wordsOk) return false;
		// Games generated before dedupe could contain the same word twice,
		// making them unwinnable — discard them.
		const normalized = p.words.map((w) => normalizeWord(w.word));
		return new Set(normalized).size === normalized.length;
	}

	return true;
}

/** Loads the persisted game; invalid or inactive saves are discarded. */
export async function loadSavedState(): Promise<WordSearchState | null> {
	const parsed = await loadJSON<unknown>(STORAGE_KEY);
	if (parsed == null) return null;
	if (!isValidSavedState(parsed)) {
		await removeKey(STORAGE_KEY);
		return null;
	}
	if (parsed.category == null || parsed.difficulty == null) return null;
	return { ...parsed, foundWords: new Set(parsed.foundWords) };
}

export function saveState(state: WordSearchState): Promise<void> {
	return saveJSON(STORAGE_KEY, { ...state, foundWords: Array.from(state.foundWords) });
}
