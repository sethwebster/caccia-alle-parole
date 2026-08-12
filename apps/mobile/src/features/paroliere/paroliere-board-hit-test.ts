import type { PathCell } from './service';

export type ParoliereBoardHitTestInput = {
	readonly boardSize: number;
	readonly gap: number;
	readonly gridSize: number;
	readonly x: number;
	readonly y: number;
};

/**
 * Pointer accepts a tile inside a rounded superellipse around its centre.
 * It reaches farther toward diagonal corners while preserving horizontal
 * and vertical dead zones between tiles, avoiding accidental side-neighbours.
 */
const ACCEPT_RADIUS_RATIO = 0.56;

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
	const normalizedX = Math.abs(x - centerX) / radius;
	const normalizedY = Math.abs(y - centerY) / radius;
	if (normalizedX ** 4 + normalizedY ** 4 > 1) return null;
	return { row, col };
}
