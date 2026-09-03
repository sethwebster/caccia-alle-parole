/**
 * Canonical Italian letter pool: 36 vowels of 77 characters (46.75%), against
 * roughly 47.6% vowels in written Italian.
 *
 * This string is byte-identical to the one features/daily/catalog-puzzle-builder.ts
 * has always used, so adopting it there is a pure move and cannot shift any daily
 * board. Free-play Paroliere previously drew from its own 47-character pool with
 * 17 vowels (36.2%), which is why random free-play boards averaged ~5.8 vowels of
 * 16 and played poorly — the complaint behind issue #28.
 *
 * lib/gridGenerator.ts carries a third pool (this string plus a trailing Y, 36 of
 * 78 = 46.15%). Word search is out of scope for #28 and is deliberately untouched.
 */
export const ITALIAN_LETTER_POOL = 'AAAAAAAAEEEEEEEEEEIIIIIIIIOOOOOOONNNNNNRRRRRLLLLTTTSSSCCCDDDUUUMMPPGGFFVVBHZQ';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function isVowel(letter: string): boolean {
	return VOWELS.has(letter);
}
