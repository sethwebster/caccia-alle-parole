import type { PathCell } from './service';

export type ParoliereBoardHitTestInput = {
	readonly boardSize: number;
	readonly gap: number;
	readonly gridSize: number;
	readonly x: number;
	readonly y: number;
};

/**
 * Pointer accepts a tile only inside a circle around its centre. The dead
 * zones between circles are what make diagonal drags reliable: a finger
 * sweeping corner-to-corner never clips an orthogonal neighbour's box.
 */
const ACCEPT_RADIUS_RATIO = 0.42;

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
	const col = Math.min(gridSize - 1, Math.floor(x / step));
	const row = Math.min(gridSize - 1, Math.floor(y / step));
	const centerX = col * step + tile / 2;
	const centerY = row * step + tile / 2;
	const radius = tile * ACCEPT_RADIUS_RATIO;
	if ((x - centerX) ** 2 + (y - centerY) ** 2 > radius * radius) return null;
	return { row, col };
}
