import type { PathCell } from './service';

export type ParoliereBoardHitTestInput = {
	readonly boardSize: number;
	readonly gap: number;
	readonly gridSize: number;
	readonly x: number;
	readonly y: number;
};

export function findParoliereCellAtPoint({
	boardSize,
	gap,
	gridSize,
	x,
	y,
}: ParoliereBoardHitTestInput): PathCell | null {
	if (boardSize <= 0 || gridSize <= 0 || x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
	const tile = (boardSize - gap * (gridSize - 1)) / gridSize;
	if (tile <= 0) return null;
	const step = tile + gap;
	const col = Math.floor(x / step);
	const row = Math.floor(y / step);
	if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
	const tileX = x - col * step;
	const tileY = y - row * step;
	if (tileX > tile || tileY > tile) return null;
	return { row, col };
}
