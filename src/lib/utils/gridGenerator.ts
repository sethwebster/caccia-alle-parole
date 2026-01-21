import type { Word, PlacedWord, Cell, Direction, Difficulty } from '$lib/types';
import { DIFFICULTY_CONFIGS } from '$lib/types';

const ITALIAN_LETTERS = 'AAAAAAAAEEEEEEEEEEIIIIIIIIOOOOOOONNNNNNRRRRRLLLLTTTSSSCCCDDDUUUMMPPGGFFVVBHZQY';

interface DirectionDef {
	dx: number;
	dy: number;
	name: Direction;
}

const DIRECTIONS: DirectionDef[] = [
	{ dx: 1, dy: 0, name: 'horizontal' },
	{ dx: -1, dy: 0, name: 'horizontal-reverse' },
	{ dx: 0, dy: 1, name: 'vertical' },
	{ dx: 0, dy: -1, name: 'vertical-reverse' },
	{ dx: 1, dy: 1, name: 'diagonal-down' },
	{ dx: -1, dy: -1, name: 'diagonal-up-reverse' },
	{ dx: 1, dy: -1, name: 'diagonal-up' },
	{ dx: -1, dy: 1, name: 'diagonal-down-reverse' }
];

// Weighted direction pool - more diagonal and backward entries for better distribution
const WEIGHTED_DIRECTIONS: DirectionDef[] = [
	// Forward directions (1x)
	{ dx: 1, dy: 0, name: 'horizontal' },
	{ dx: 0, dy: 1, name: 'vertical' },
	// Backward directions (3x each)
	{ dx: -1, dy: 0, name: 'horizontal-reverse' },
	{ dx: -1, dy: 0, name: 'horizontal-reverse' },
	{ dx: -1, dy: 0, name: 'horizontal-reverse' },
	{ dx: 0, dy: -1, name: 'vertical-reverse' },
	{ dx: 0, dy: -1, name: 'vertical-reverse' },
	{ dx: 0, dy: -1, name: 'vertical-reverse' },
	// Diagonal directions (4x each)
	{ dx: 1, dy: 1, name: 'diagonal-down' },
	{ dx: 1, dy: 1, name: 'diagonal-down' },
	{ dx: 1, dy: 1, name: 'diagonal-down' },
	{ dx: 1, dy: 1, name: 'diagonal-down' },
	{ dx: -1, dy: -1, name: 'diagonal-up-reverse' },
	{ dx: -1, dy: -1, name: 'diagonal-up-reverse' },
	{ dx: -1, dy: -1, name: 'diagonal-up-reverse' },
	{ dx: -1, dy: -1, name: 'diagonal-up-reverse' },
	{ dx: 1, dy: -1, name: 'diagonal-up' },
	{ dx: 1, dy: -1, name: 'diagonal-up' },
	{ dx: 1, dy: -1, name: 'diagonal-up' },
	{ dx: 1, dy: -1, name: 'diagonal-up' },
	{ dx: -1, dy: 1, name: 'diagonal-down-reverse' },
	{ dx: -1, dy: 1, name: 'diagonal-down-reverse' },
	{ dx: -1, dy: 1, name: 'diagonal-down-reverse' },
	{ dx: -1, dy: 1, name: 'diagonal-down-reverse' }
];

const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
	'horizontal': [0, 1],
	'vertical': [1, 0],
	'diagonal-down': [1, 1],
	'diagonal-up': [-1, 1],
	'horizontal-reverse': [0, -1],
	'vertical-reverse': [-1, 0],
	'diagonal-down-reverse': [1, -1],
	'diagonal-up-reverse': [-1, -1]
};

function createEmptyGrid(size: number): Cell[][] {
	return Array.from({ length: size }, (_, row) =>
		Array.from({ length: size }, (_, col) => ({
			letter: '',
			row,
			col,
			placed: false
		}))
	);
}

function canPlaceWord(
	grid: Cell[][],
	word: string,
	row: number,
	col: number,
	direction: DirectionDef
): boolean {
	const { dx, dy } = direction;
	const size = grid.length;

	for (let i = 0; i < word.length; i++) {
		const newRow = row + (dy * i);
		const newCol = col + (dx * i);

		if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
			return false;
		}

		const cell = grid[newRow][newCol];
		if (cell.letter !== '' && cell.letter !== word[i]) {
			return false;
		}
	}

	return true;
}

function placeWord(
	grid: Cell[][],
	word: string,
	row: number,
	col: number,
	direction: DirectionDef
): void {
	const { dx, dy } = direction;

	for (let i = 0; i < word.length; i++) {
		const newRow = row + (dy * i);
		const newCol = col + (dx * i);
		grid[newRow][newCol].letter = word[i];
		grid[newRow][newCol].placed = true;
	}
}

function calculatePoints(word: string, difficulty: Difficulty): number {
	const basePoints = word.length * 10;
	const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
	return Math.round(basePoints * difficultyMultiplier);
}

function createAlmostMatch(word: string): string {
	// Create a word that's similar but not identical
	// Change 1-2 letters to create an "almost" match
	const chars = word.split('');
	const numChanges = Math.random() < 0.5 ? 1 : 2;

	for (let i = 0; i < numChanges; i++) {
		const pos = Math.floor(Math.random() * chars.length);
		const newChar = ITALIAN_LETTERS[Math.floor(Math.random() * ITALIAN_LETTERS.length)];
		chars[pos] = newChar;
	}

	return chars.join('');
}

function tryPlaceDecoy(
	grid: Cell[][],
	word: string,
	gridSize: number,
	maxAttempts: number
): boolean {
	const decoyWord = createAlmostMatch(word);

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const direction = WEIGHTED_DIRECTIONS[Math.floor(Math.random() * WEIGHTED_DIRECTIONS.length)];
		const row = Math.floor(Math.random() * gridSize);
		const col = Math.floor(Math.random() * gridSize);

		if (canPlaceWord(grid, decoyWord, row, col, direction)) {
			placeWord(grid, decoyWord, row, col, direction);
			return true;
		}
	}

	return false;
}

export function generateGrid(
	words: Word[],
	difficulty: Difficulty
): { grid: Cell[][], placedWords: PlacedWord[] } {
	const config = DIFFICULTY_CONFIGS[difficulty];
	const gridSize = config.gridSize;
	const wordCount = Math.min(config.wordCount, words.length);

	const grid = createEmptyGrid(gridSize);

	const shuffled = [...words].sort(() => Math.random() - 0.5);
	const selectedWords = shuffled.slice(0, wordCount);

	selectedWords.sort((a, b) => b.word.length - a.word.length);

	const placedWords: PlacedWord[] = [];

	for (const wordData of selectedWords) {
		const word = wordData.word.toUpperCase();
		let placed = false;
		let attempts = 0;
		const maxAttempts = 100;

		while (!placed && attempts < maxAttempts) {
			attempts++;

			const direction = WEIGHTED_DIRECTIONS[Math.floor(Math.random() * WEIGHTED_DIRECTIONS.length)];
			const row = Math.floor(Math.random() * gridSize);
			const col = Math.floor(Math.random() * gridSize);

			if (canPlaceWord(grid, word, row, col, direction)) {
				placeWord(grid, word, row, col, direction);
				placedWords.push({
					...wordData,
					row,
					col,
					direction: direction.name,
					points: calculatePoints(word, difficulty)
				});
				placed = true;
			}
		}
	}

	// For hard difficulty, add a couple "almost" matches as decoys
	if (difficulty === 'hard' && placedWords.length > 0) {
		const numDecoys = Math.min(2, Math.floor(placedWords.length / 3));
		for (let i = 0; i < numDecoys; i++) {
			const targetWord = placedWords[Math.floor(Math.random() * placedWords.length)].word;
			tryPlaceDecoy(grid, targetWord, gridSize, 50);
		}
	}

	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			if (grid[row][col].letter === '') {
				grid[row][col].letter = ITALIAN_LETTERS[Math.floor(Math.random() * ITALIAN_LETTERS.length)];
			}
		}
	}

	return { grid, placedWords };
}

export function getDirectionDelta(direction: Direction): [number, number] {
	return DIRECTION_DELTAS[direction];
}
