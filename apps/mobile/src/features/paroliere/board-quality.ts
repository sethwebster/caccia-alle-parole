import { wordDatabase } from '@/data/word-data';
import { ITALIAN_LETTER_POOL, isVowel } from '@/lib/italian-letters';
import { randomIndex, type SeededRandom } from '@/lib/seeded-random';

export const BOARD_SIZE = 4;

/**
 * Playability is measured against data/word-data.ts, not lib/dictionary.ts.
 *
 * The dictionary is a lazily built ~260k-form Map with no prefix or trie
 * structure, so there is nothing to prune a board-wide search against: scoring a
 * board that way would mean enumerating every path in the 4x4 king graph and
 * probing each one. word-data is the curated everyday vocabulary the rest of the
 * app already bundles, and "how many ordinary words can a player actually find
 * here" is the thing issue #28 is about. A board scoring well here is a board
 * that plays well, even though the dictionary still accepts far more words than
 * we count.
 */
const MIN_WORD_LENGTH = 3;
/** Above this, findable words are rare enough that scoring them costs more than it measures. */
const MAX_WORD_LENGTH = 8;

type Candidate = {
	readonly word: string;
	readonly counts: ReadonlyMap<string, number>;
};

let candidateCache: readonly Candidate[] | null = null;

/**
 * NFD decomposes an accented letter into its base plus a combining mark, so
 * dropping everything outside A-Z strips accents, spaces and punctuation in one
 * pass and leaves exactly the alphabet the grid is drawn from. The repo's other
 * normalizers spell the combining range out as a literal character class; this
 * avoids putting invisible characters in source.
 */
function normalize(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[^A-Za-z]/g, '')
		.toUpperCase();
}

function letterCounts(letters: Iterable<string>): Map<string, number> {
	const counts = new Map<string, number>();
	for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
	return counts;
}

/** Built once per process: the same curated list scores every board. */
function candidates(): readonly Candidate[] {
	if (candidateCache !== null) return candidateCache;
	const seen = new Set<string>();
	const built: Candidate[] = [];
	for (const entries of Object.values(wordDatabase)) {
		for (const entry of entries) {
			const word = normalize(entry.word);
			if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) continue;
			// Multi-word and punctuated entries collapse into strings a player never traces.
			if (/\s/.test(entry.word) || seen.has(word)) continue;
			seen.add(word);
			built.push({ word, counts: letterCounts(word) });
		}
	}
	candidateCache = built;
	return built;
}

/** Cheap precheck: a word the board lacks the letters for can never be traced. */
function fitsLetterBudget(counts: ReadonlyMap<string, number>, budget: ReadonlyMap<string, number>): boolean {
	for (const [letter, needed] of counts) {
		if ((budget.get(letter) ?? 0) < needed) return false;
	}
	return true;
}

/**
 * Depth-first trace under the game's own rules: eight-way adjacency, and no tile
 * reused within one path. Matches ParoliereService.extendSelection, so a word
 * counted here is a word the player can actually draw.
 */
export function isTraceable(grid: readonly (readonly string[])[], word: string): boolean {
	const size = grid.length;
	const used = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

	const walk = (row: number, col: number, index: number): boolean => {
		if (grid[row]?.[col] !== word[index]) return false;
		if (index === word.length - 1) return true;
		used[row][col] = true;
		for (let rowStep = -1; rowStep <= 1; rowStep += 1) {
			for (let colStep = -1; colStep <= 1; colStep += 1) {
				if (rowStep === 0 && colStep === 0) continue;
				const nextRow = row + rowStep;
				const nextCol = col + colStep;
				if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
				if (used[nextRow][nextCol]) continue;
				if (walk(nextRow, nextCol, index + 1)) {
					used[row][col] = false;
					return true;
				}
			}
		}
		used[row][col] = false;
		return false;
	};

	for (let row = 0; row < size; row += 1) {
		for (let col = 0; col < size; col += 1) {
			if (walk(row, col, 0)) return true;
		}
	}
	return false;
}

export type BoardQuality = {
	readonly traceableWords: readonly string[];
	readonly wordCount: number;
	readonly vowelCount: number;
	readonly longestWord: number;
};

export function countVowels(grid: readonly (readonly string[])[]): number {
	return grid.flat().filter(isVowel).length;
}

export function scoreBoard(grid: readonly (readonly string[])[]): BoardQuality {
	const letters = grid.flat();
	const budget = letterCounts(letters);
	const traceableWords: string[] = [];
	for (const candidate of candidates()) {
		if (!fitsLetterBudget(candidate.counts, budget)) continue;
		if (isTraceable(grid, candidate.word)) traceableWords.push(candidate.word);
	}
	return {
		traceableWords,
		wordCount: traceableWords.length,
		vowelCount: letters.filter(isVowel).length,
		longestWord: traceableWords.reduce((longest, word) => Math.max(longest, word.length), 0),
	};
}

/**
 * Calibrated, not guessed. Over 100 seeded boards drawn from ITALIAN_LETTER_POOL
 * and filtered only by the vowel window, traceable curated words per board were:
 * min 0, p25 3, median 6, p75 8, max 16, mean 6.02.
 *
 * The floor sits one above the measured lower quartile, so it rejects the bottom
 * quarter of draws — including the boards with nothing findable on them, which is
 * the complaint issue #28 opens with. It is deliberately not set at the median:
 * this metric counts a 2361-word curated subset, while the game validates against
 * the ~260k-form dictionary, so a high floor would tune generation to the curated
 * list rather than to playability. Re-run the calibration test and revisit these
 * numbers if the letter pool or word-data changes.
 */
export const MIN_TRACEABLE_WORDS = 4;

/**
 * Derived rather than guessed: at a 46.75% pool the number of vowels in 16 draws
 * is Binomial(16, 0.4675), mean 7.5 and sd ~2.0, so [5, 10] keeps roughly the
 * middle 80% and rejects the vowel-starved tail that opened issue #28.
 */
export const MIN_VOWELS = 5;
export const MAX_VOWELS = 10;
export const MAX_GENERATION_ATTEMPTS = 12;

function withinVowelWindow(vowelCount: number): boolean {
	return vowelCount >= MIN_VOWELS && vowelCount <= MAX_VOWELS;
}

export function meetsThresholds(quality: BoardQuality): boolean {
	return quality.wordCount >= MIN_TRACEABLE_WORDS && withinVowelWindow(quality.vowelCount);
}

function drawGrid(random: SeededRandom): string[][] {
	return Array.from({ length: BOARD_SIZE }, () =>
		Array.from(
			{ length: BOARD_SIZE },
			() => ITALIAN_LETTER_POOL[randomIndex(random, ITALIAN_LETTER_POOL.length)] ?? 'A',
		),
	);
}

/**
 * Rejection sampling with a bounded retry. On exhaustion this returns the best
 * board it drew — never a fixed fallback grid, which is what issue #28 rules out:
 * "avoid baking a single fixed board into normal generation". Every board a
 * player sees is freshly sampled; the retry only biases which sample survives.
 *
 * `random` defaults to Math.random for normal play and takes a seeded source in
 * tests, which is what makes the sampled distribution assertable at all.
 */
export function generateBoard(random: SeededRandom = Math.random): string[][] {
	let firstGrid: string[][] | null = null;
	let bestGrid: string[][] | null = null;
	let bestWordCount = -1;

	for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
		const grid = drawGrid(random);
		firstGrid ??= grid;
		// Counting vowels is free; scoring against the curated list is not. A board
		// outside the window is rejected whatever it scores, so never score it.
		if (!withinVowelWindow(countVowels(grid))) continue;
		const quality = scoreBoard(grid);
		if (meetsThresholds(quality)) return grid;
		if (quality.wordCount > bestWordCount) {
			bestGrid = grid;
			bestWordCount = quality.wordCount;
		}
	}
	// Every attempt fell short: hand back the best sample rather than a fixed grid.
	return bestGrid ?? firstGrid ?? drawGrid(random);
}
