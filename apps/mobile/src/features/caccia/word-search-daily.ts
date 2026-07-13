import { dailyProgressMutationQueue, type DailyProgressMutationQueue } from '@/features/daily/progress';
import type { ChallengeSource, TerminalAttemptContext, TerminalReason } from '@/features/daily/types';
import type { Difficulty, Direction, PlacedWord, WordSearchState } from '@/lib/types';

import { normalizeWord } from './word-search-service';

export type WordSearchDailyCellPosition = {
	readonly row: number;
	readonly col: number;
};

export type WordSearchDailyPlacedWord = {
	readonly word: string;
	readonly translation: string;
	readonly definition: string;
	readonly row: number;
	readonly col: number;
	readonly direction: Direction;
	readonly points: number;
	readonly cells: readonly WordSearchDailyCellPosition[];
};

export type WordSearchDailyChallengePayload = {
	readonly category: string;
	readonly difficulty: Difficulty;
	readonly grid: readonly (readonly string[])[];
	readonly words: readonly WordSearchDailyPlacedWord[];
};

export type WordSearchDailyPayloadNormalization =
	| { readonly kind: 'valid'; readonly payload: WordSearchDailyChallengePayload; readonly changed: boolean }
	| { readonly kind: 'invalid' };

export type WordSearchChallengeSummary = {
	readonly puzzleKey: 'caccia';
	readonly reason: TerminalReason;
	readonly category: string;
	readonly difficulty: Difficulty;
	readonly score: number;
	readonly foundWords: readonly string[];
	readonly completedUnits: number;
	readonly totalUnits: number;
};

export type WordSearchGiveUpInput = {
	readonly context: TerminalAttemptContext;
	readonly source: ChallengeSource;
	readonly completedAt: Date;
};

export class WordSearchChallengeValidationError extends Error {
	readonly name = 'WordSearchChallengeValidationError';

	constructor(readonly field: string) {
		super(`Invalid Caccia challenge ${field}`);
	}
}

export function createDailyChallengeGame(payload: WordSearchDailyChallengePayload): WordSearchState {
	validatePayload(payload);
	const placedCells = placedCellKeys(payload.words);
	return {
		category: payload.category,
		difficulty: payload.difficulty,
		words: payload.words.map(copyPlacedWord),
		foundWords: new Set(),
		score: 0,
		grid: payload.grid.map((row, rowIndex) =>
			row.map((letter, colIndex) => ({
				letter,
				row: rowIndex,
				col: colIndex,
				placed: placedCells.has(cellKey(rowIndex, colIndex)),
			})),
		),
	};
}

export function normalizeWordSearchDailyChallengePayload(payload: WordSearchDailyChallengePayload): WordSearchDailyPayloadNormalization {
	if (payload.category.length === 0 || payload.words.length === 0 || !isValidGrid(payload.grid)) return { kind: 'invalid' };
	const normalizedWords = payload.words.map((word) => normalizeWord(word.word));
	if (new Set(normalizedWords).size !== normalizedWords.length) return { kind: 'invalid' };
	const words: WordSearchDailyPlacedWord[] = [];
	let changed = false;
	for (const word of payload.words) {
		const normalized = normalizePlacedWordFromCells(word, payload.grid);
		if (normalized.kind === 'invalid') return { kind: 'invalid' };
		words.push(normalized.word);
		changed = changed || normalized.changed;
	}
	return changed ? { kind: 'valid', payload: { ...payload, words }, changed } : { kind: 'valid', payload, changed };
}

export function summarizeWordSearchChallenge(state: WordSearchState, reason: TerminalReason): WordSearchChallengeSummary {
	if (state.category === null) throw new WordSearchChallengeValidationError('category');
	if (state.difficulty === null) throw new WordSearchChallengeValidationError('difficulty');
	return {
		puzzleKey: 'caccia',
		reason,
		category: state.category,
		difficulty: state.difficulty,
		score: state.score,
		foundWords: Array.from(state.foundWords),
		completedUnits: state.foundWords.size,
		totalUnits: state.words.length,
	};
}

export function recordWordSearchGiveUp(
	input: WordSearchGiveUpInput,
	queue: Pick<DailyProgressMutationQueue, 'recordPuzzleTerminal'> = dailyProgressMutationQueue,
) {
	if (input.context.puzzleKey !== 'caccia') throw new WordSearchChallengeValidationError('context');
	return queue.recordPuzzleTerminal({
		...input.context,
		reason: 'giveUp',
		completedAt: input.completedAt,
		source: input.source,
	});
}

function validatePayload(payload: WordSearchDailyChallengePayload): void {
	if (payload.category.length === 0) throw new WordSearchChallengeValidationError('category');
	validateGrid(payload.grid);
	if (payload.words.length === 0) throw new WordSearchChallengeValidationError('words');
	validateUniqueWords(payload.words);
	for (const word of payload.words) validatePlacedWord(word, payload.grid);
}

function validateGrid(grid: readonly (readonly string[])[]): void {
	if (!isValidGrid(grid)) throw new WordSearchChallengeValidationError('grid');
}

function validateUniqueWords(words: readonly WordSearchDailyPlacedWord[]): void {
	const normalized = words.map((word) => normalizeWord(word.word));
	if (new Set(normalized).size !== normalized.length) throw new WordSearchChallengeValidationError('words');
}

function validatePlacedWord(word: WordSearchDailyPlacedWord, grid: readonly (readonly string[])[]): void {
	if (word.word.length === 0 || word.translation.length === 0 || word.definition.length === 0) throw new WordSearchChallengeValidationError('words');
	if (word.points <= 0 || !Number.isInteger(word.points)) throw new WordSearchChallengeValidationError('points');
	const normalized = normalizeWord(word.word);
	if (word.cells.length !== normalized.length) throw new WordSearchChallengeValidationError('cells');
	const [firstCell] = word.cells;
	if (firstCell === undefined || firstCell.row !== word.row || firstCell.col !== word.col) throw new WordSearchChallengeValidationError('cells');
	const letters = word.cells.map((cell) => letterAt(grid, cell)).join('');
	if (letters !== normalized) throw new WordSearchChallengeValidationError('cells');
	if (directionFromCells(word.cells) !== word.direction) throw new WordSearchChallengeValidationError('direction');
}

function letterAt(grid: readonly (readonly string[])[], cell: WordSearchDailyCellPosition): string {
	const letter = grid[cell.row]?.[cell.col];
	if (letter === undefined) throw new WordSearchChallengeValidationError('cells');
	return letter;
}

function directionFromCells(cells: readonly WordSearchDailyCellPosition[]): Direction {
	const first = cells[0];
	const second = cells[1];
	if (first === undefined || second === undefined) throw new WordSearchChallengeValidationError('cells');
	const rowStep = second.row - first.row;
	const colStep = second.col - first.col;
	for (let index = 1; index < cells.length; index += 1) {
		const previous = cells[index - 1];
		const current = cells[index];
		if (previous === undefined || current === undefined || current.row - previous.row !== rowStep || current.col - previous.col !== colStep) {
			throw new WordSearchChallengeValidationError('cells');
		}
	}
	return directionFromStep(rowStep, colStep);
}

function directionFromStep(rowStep: number, colStep: number): Direction {
	switch (`${rowStep},${colStep}`) {
		case '0,1':
			return 'horizontal';
		case '1,0':
			return 'vertical';
		case '1,1':
			return 'diagonal-down';
		case '-1,1':
			return 'diagonal-up';
		case '0,-1':
			return 'horizontal-reverse';
		case '-1,0':
			return 'vertical-reverse';
		case '1,-1':
			return 'diagonal-down-reverse';
		case '-1,-1':
			return 'diagonal-up-reverse';
		default:
			throw new WordSearchChallengeValidationError('direction');
	}
}

function placedCellKeys(words: readonly WordSearchDailyPlacedWord[]): Set<string> {
	return new Set(words.flatMap((word) => word.cells.map((cell) => cellKey(cell.row, cell.col))));
}

function cellKey(row: number, col: number): string {
	return `${row}:${col}`;
}

function copyPlacedWord(word: WordSearchDailyPlacedWord): PlacedWord {
	return { ...word, cells: word.cells.map((cell) => ({ ...cell })) };
}

function isValidGrid(grid: readonly (readonly string[])[]): boolean {
	if (grid.length === 0) return false;
	const width = grid[0]?.length ?? 0;
	if (width === 0) return false;
	return grid.every((row) => row.length === width && row.every((letter) => /^[A-ZÀ-Ù]$/.test(letter)));
}

function normalizePlacedWordFromCells(
	word: WordSearchDailyPlacedWord,
	grid: readonly (readonly string[])[],
): { readonly kind: 'valid'; readonly word: WordSearchDailyPlacedWord; readonly changed: boolean } | { readonly kind: 'invalid' } {
	if (word.word.length === 0 || word.translation.length === 0 || word.definition.length === 0) return { kind: 'invalid' };
	if (word.points <= 0 || !Number.isInteger(word.points)) return { kind: 'invalid' };
	const normalized = normalizeWord(word.word);
	if (word.cells.length !== normalized.length) return { kind: 'invalid' };
	const placement = placementFromCells(word.cells);
	if (placement === null) return { kind: 'invalid' };
	const letters = lettersFromCells(grid, word.cells);
	if (letters !== normalized) return { kind: 'invalid' };
	if (word.row === placement.row && word.col === placement.col && word.direction === placement.direction) {
		return { kind: 'valid', word, changed: false };
	}
	if (word.row === 0 && word.col === 0 && word.direction === 'horizontal') {
		return { kind: 'valid', word: { ...word, row: placement.row, col: placement.col, direction: placement.direction }, changed: true };
	}
	return { kind: 'invalid' };
}

function placementFromCells(cells: readonly WordSearchDailyCellPosition[]): { readonly row: number; readonly col: number; readonly direction: Direction } | null {
	const first = cells[0];
	if (first === undefined) return null;
	try {
		return { row: first.row, col: first.col, direction: directionFromCells(cells) };
	} catch (error) {
		if (error instanceof WordSearchChallengeValidationError) return null;
		throw error;
	}
}

function lettersFromCells(grid: readonly (readonly string[])[], cells: readonly WordSearchDailyCellPosition[]): string | null {
	let letters = '';
	for (const cell of cells) {
		const letter = grid[cell.row]?.[cell.col];
		if (letter === undefined) return null;
		letters += letter;
	}
	return letters;
}
