/**
 * Seeded pseudo-randomness shared by the daily generator and free-play board
 * sampling: FNV-1a to fold a string seed into 32 bits, then mulberry32.
 *
 * Moved verbatim out of features/daily/catalog-puzzle-builder.ts. Every symbol
 * here is byte-identical to the version that generator has always used, so the
 * daily challenge snapshots in features/daily/__fixtures__/challenge-snapshots.json
 * must be unchanged by this move. If one of them moves, the move was not pure.
 *
 * NOT moved: hashIndex(). It looks like hashValue() but reduces a SIGNED hash
 * with Math.abs(hash) % size, where hashValue() below returns an unsigned value.
 * Merging them would silently change daily theme rotation and answer placement.
 * It stays local to the daily builder.
 */

export type SeededRandom = () => number;

/** FNV-1a. The fallback constant keeps a zero hash out of mulberry32's degenerate state. */
function hashValue(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return hash >>> 0;
}

export function createSeededRandom(seed: string): SeededRandom {
	let state = hashValue(seed) || 0x9e3779b9;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

export function randomIndex(random: SeededRandom, size: number): number {
	return Math.floor(random() * size);
}

export function shuffle<T>(values: readonly T[], random: SeededRandom): T[] {
	const result = [...values];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = randomIndex(random, index + 1);
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}
	return result;
}
