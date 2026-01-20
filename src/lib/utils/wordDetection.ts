import type { Cell, PlacedWord } from '$lib/types';

export interface SelectedCell {
	row: number;
	col: number;
	letter: string;
}

export function getCellsBetween(
	startRow: number,
	startCol: number,
	endRow: number,
	endCol: number,
	grid: Cell[][]
): SelectedCell[] {
	const cells: SelectedCell[] = [];

	const rowDiff = endRow - startRow;
	const colDiff = endCol - startCol;

	const absRowDiff = Math.abs(rowDiff);
	const absColDiff = Math.abs(colDiff);

	// Check if it's a valid direction (horizontal, vertical, or diagonal)
	const isHorizontal = absRowDiff === 0;
	const isVertical = absColDiff === 0;
	const isDiagonal = absRowDiff === absColDiff;

	if (!isHorizontal && !isVertical && !isDiagonal) {
		return [];
	}

	const steps = Math.max(absRowDiff, absColDiff);
	const rowStep = steps === 0 ? 0 : rowDiff / steps;
	const colStep = steps === 0 ? 0 : colDiff / steps;

	for (let i = 0; i <= steps; i++) {
		const row = Math.round(startRow + i * rowStep);
		const col = Math.round(startCol + i * colStep);

		if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
			cells.push({
				row,
				col,
				letter: grid[row][col].letter
			});
		}
	}

	return cells;
}

export function getWordFromCells(cells: SelectedCell[]): string {
	return cells.map(c => c.letter).join('');
}

export function checkIfWordFound(
	selectedWord: string,
	placedWords: PlacedWord[]
): PlacedWord | null {
	const upperWord = selectedWord.toUpperCase();

	for (const placedWord of placedWords) {
		// Remove spaces from multi-word entries for comparison
		const placedUpper = placedWord.word.toUpperCase().replace(/\s+/g, '');

		// Check forward and reverse
		if (upperWord === placedUpper || upperWord === placedUpper.split('').reverse().join('')) {
			return placedWord;
		}
	}

	return null;
}

export function areCellsEqual(cell1: SelectedCell | null, cell2: SelectedCell | null): boolean {
	if (!cell1 || !cell2) return false;
	return cell1.row === cell2.row && cell1.col === cell2.col;
}

export function isCellInList(cell: SelectedCell, cells: SelectedCell[]): boolean {
	return cells.some(c => c.row === cell.row && c.col === cell.col);
}
