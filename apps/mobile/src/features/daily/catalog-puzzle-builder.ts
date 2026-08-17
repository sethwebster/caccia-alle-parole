import type { Difficulty, Direction, Word } from '@/lib/types';
import { wordDatabase } from '@/data/word-data';

import { CATALOG_ROTATION_BASE, THEMES, type ThemeSeed } from './catalog-content';
import { civilDayIndex, makeLocalCivilDate } from './date';
import { CANONICAL_PUZZLE_KEYS, CANONICAL_PUZZLE_LABELS, type ChallengeId, type DailyPuzzleKey, type DailyPuzzleSpec, type ThemeQuizData } from './types';

const GENERATOR_VERSION = 'daily-catalog-generator-v2';
const DICTIONARY_VERSION = 'it-bundled-v2';
const WORD_SEARCH_SIZE = 10;
/** Three curated theme words alone left the daily grid far emptier than free play (10 words on the same 10x10 board). */
const WORD_SEARCH_WORD_COUNT = 6;
const PAROLIERE_SIZE = 4;
const ITALIAN_LETTERS = 'AAAAAAAAEEEEEEEEEEIIIIIIIIOOOOOOONNNNNNRRRRRLLLLTTTSSSCCCDDDUUUMMPPGGFFVVBHZQ';

type SeededRandom = () => number;

const WORD_SEARCH_DIRECTIONS = [
	{ direction: 'horizontal', rowStep: 0, colStep: 1 },
	{ direction: 'vertical', rowStep: 1, colStep: 0 },
	{ direction: 'diagonal-down', rowStep: 1, colStep: 1 },
	{ direction: 'diagonal-up', rowStep: -1, colStep: 1 },
	{ direction: 'horizontal-reverse', rowStep: 0, colStep: -1 },
	{ direction: 'vertical-reverse', rowStep: -1, colStep: 0 },
	{ direction: 'diagonal-down-reverse', rowStep: 1, colStep: -1 },
	{ direction: 'diagonal-up-reverse', rowStep: -1, colStep: -1 },
] as const satisfies readonly { readonly direction: Direction; readonly rowStep: number; readonly colStep: number }[];

export type DailyCatalogTheme = {
	readonly themeId: string;
	readonly label: string;
	readonly explanation: string;
	readonly choices: readonly [string, string, string, string];
	readonly answerIndex: number;
};

export type DailyCatalogPuzzlePayload =
	| { readonly targetWord: string; readonly maxAttempts: number }
	| { readonly category: string; readonly difficulty: Difficulty; readonly grid: readonly (readonly string[])[]; readonly words: readonly DailyCatalogPlacedWord[] }
	| { readonly grid: readonly (readonly string[])[]; readonly durationSeconds: number }
	| { readonly targetWord: string; readonly targetCategory: string; readonly targetTranslation: string; readonly targetDefinition: string; readonly lives: number }
	| { readonly targetWord: string; readonly tiles: readonly string[]; readonly translation: string; readonly definition: string; readonly category: string; readonly durationSeconds: number };

type DailyCatalogPlacedWord = {
	readonly word: string;
	readonly translation: string;
	readonly definition: string;
	readonly row: number;
	readonly col: number;
	readonly direction: Direction;
	readonly points: number;
	readonly cells: readonly { readonly row: number; readonly col: number }[];
};

export type DailyCatalogPuzzleSpec = DailyPuzzleSpec & {
	readonly themeId: string;
	readonly themeLink: string;
	readonly generatorVersion: string;
	readonly dictionaryVersion: string;
	readonly target: string;
	readonly payload: DailyCatalogPuzzlePayload;
};

const ROTATION_BASE_DAY = civilDayIndex(makeLocalCivilDate(CATALOG_ROTATION_BASE));

export function pickCatalogTheme(challengeId: ChallengeId): ThemeSeed {
	return THEMES[rotationForChallenge(challengeId).themeIndex] ?? THEMES[0];
}

/**
 * Days are grouped into cycles of one day per theme. Each cycle draws a fresh
 * permutation of the whole theme list, so a theme returns only once the others
 * have been used, and the word each puzzle draws from that theme advances every
 * cycle. Hashing each day independently — the previous behaviour — repeated
 * themes and targets on back-to-back days.
 */
function rotationForChallenge(challengeId: ChallengeId): { readonly themeIndex: number; readonly cycle: number } {
	const dayIndex = civilDayIndex(challengeId) - ROTATION_BASE_DAY;
	const cycle = Math.floor(dayIndex / THEMES.length);
	const position = dayIndex - cycle * THEMES.length;
	return { themeIndex: themeOrderForCycle(cycle)[position] ?? 0, cycle };
}

/** Swaps the first two entries when a cycle would otherwise reopen with the theme that just closed the previous one. */
function themeOrderForCycle(cycle: number): readonly number[] {
	const [first, second, ...rest] = shuffledThemeOrder(cycle);
	const previousLast = shuffledThemeOrder(cycle - 1)[THEMES.length - 1];
	if (first === undefined || second === undefined || first !== previousLast) return [first, second, ...rest].filter(isIndex);
	return [second, first, ...rest].filter(isIndex);
}

function shuffledThemeOrder(cycle: number): readonly number[] {
	return shuffle(THEMES.map((_, index) => index), createSeededRandom(`theme-order:${cycle}`));
}

function isIndex(value: number | undefined): value is number {
	return value !== undefined;
}

/** Each puzzle starts on its own word so the five games never advance in lockstep. */
function targetForCycle(words: readonly [string, string, string], key: DailyPuzzleKey, cycle: number): string {
	const offset = cycle + CANONICAL_PUZZLE_KEYS.indexOf(key);
	return words[((offset % words.length) + words.length) % words.length] ?? words[0];
}

export function buildCatalogTheme(challengeId: ChallengeId, seed: ThemeSeed): DailyCatalogTheme {
	const answerIndex = hashIndex(`${challengeId}:theme-answer`, 4);
	const distractors = rotate(seed.distractors, hashIndex(`${challengeId}:distractors`, seed.distractors.length));
	const choices = insertAnswer(seed.label, distractors, answerIndex);
	return { themeId: seed.themeId, label: seed.label, explanation: seed.explanation, choices, answerIndex };
}

export function buildCatalogPuzzle(
	challengeId: ChallengeId,
	key: DailyPuzzleKey,
	themeSeed: ThemeSeed,
	theme: DailyCatalogTheme,
): DailyCatalogPuzzleSpec {
	const words = themeSeed.puzzleWords[key];
	const target = targetForCycle(words, key, rotationForChallenge(challengeId).cycle);
	return {
		key,
		label: CANONICAL_PUZZLE_LABELS[key],
		themeQuiz: buildThemeQuiz(theme),
		themeId: theme.themeId,
		themeLink: `${CANONICAL_PUZZLE_LABELS[key]} collega ${target} a ${theme.label}`,
		generatorVersion: GENERATOR_VERSION,
		dictionaryVersion: DICTIONARY_VERSION,
		target,
		payload: buildPuzzlePayload(challengeId, key, themeSeed, target, theme),
	};
}

function buildPuzzlePayload(challengeId: ChallengeId, key: DailyPuzzleKey, seed: ThemeSeed, target: string, theme: DailyCatalogTheme): DailyCatalogPuzzlePayload {
	switch (key) {
		case 'parola':
			return { targetWord: target, maxAttempts: 6 };
		case 'caccia':
			return buildCacciaPayload(challengeId, seed, theme);
		case 'paroliere':
			return { grid: buildParoliereGrid(challengeId, target), durationSeconds: 180 };
		case 'impiccato':
			return { targetWord: target, targetCategory: theme.label, targetTranslation: theme.label, targetDefinition: theme.explanation, lives: 6 };
		case 'anagrammi':
			return { targetWord: target, tiles: rotateLetters(target), translation: theme.label, definition: theme.explanation, category: theme.label, durationSeconds: 60 };
	}
}

function buildCacciaPayload(challengeId: ChallengeId, seed: ThemeSeed, theme: DailyCatalogTheme): Extract<DailyCatalogPuzzlePayload, { readonly category: string }> {
	const random = createSeededRandom(`${challengeId}:caccia-grid`);
	const grid = Array.from({ length: WORD_SEARCH_SIZE }, () => Array.from({ length: WORD_SEARCH_SIZE }, () => ''));
	const placedWords: DailyCatalogPlacedWord[] = [];
	const directionOffset = randomIndex(random, WORD_SEARCH_DIRECTIONS.length);
	const place = (entry: Word): boolean => {
		const normalized = normalizeLetters(entry.word);
		const placement = placeCatalogWord(grid, normalized, placedWords.length, directionOffset, random);
		if (placement === null) return false;
		placedWords.push({
			word: entry.word,
			translation: entry.translation,
			definition: entry.definition,
			row: placement.cells[0]?.row ?? 0,
			col: placement.cells[0]?.col ?? 0,
			direction: placement.direction,
			points: normalized.length * 10,
			cells: placement.cells,
		});
		return true;
	};

	// Curated theme words are mandatory — they carry the hidden-theme link — and
	// go down longest first, because a 10-letter word barely fits a 10x10 board.
	for (const word of [...seed.puzzleWords.caccia].sort((left, right) => normalizeLetters(right).length - normalizeLetters(left).length)) {
		if (!place({ word, translation: theme.label, definition: theme.explanation })) throw new Error(`Unable to place daily Caccia word ${word}`);
	}

	// Then fill from the theme's word-data category up to a playable board size.
	// Candidates the remaining space cannot fit are passed over rather than
	// failing the day: the category offers 70+ alternatives.
	const taken = new Set(placedWords.map((word) => normalizeLetters(word.word)));
	for (const candidate of shuffle(wordDatabase[seed.cacciaFill], createSeededRandom(`${challengeId}:caccia-fill`))) {
		if (placedWords.length === WORD_SEARCH_WORD_COUNT) break;
		const normalized = normalizeLetters(candidate.word);
		// Multi-word entries would collapse into a string the player never sees spelled that way.
		if (/\s/.test(candidate.word) || normalized.length < 3 || normalized.length > WORD_SEARCH_SIZE || taken.has(normalized)) continue;
		taken.add(normalized);
		// Word-data stores lowercase headwords; daily words are published uppercase and accent-free like the grid.
		place({ ...candidate, word: normalized });
	}
	if (placedWords.length !== WORD_SEARCH_WORD_COUNT) throw new Error(`Unable to fill daily Caccia grid for ${seed.themeId}`);

	for (const row of grid) {
		for (let col = 0; col < row.length; col += 1) {
			if (row[col] === '') row[col] = randomLetter(random);
		}
	}
	return {
		category: theme.label,
		difficulty: 'easy',
		grid,
		words: placedWords,
	};
}

function placeCatalogWord(
	grid: string[][],
	word: string,
	wordIndex: number,
	directionOffset: number,
	random: SeededRandom,
): { readonly direction: Direction; readonly cells: readonly { readonly row: number; readonly col: number }[] } | null {
	for (let directionIndex = 0; directionIndex < WORD_SEARCH_DIRECTIONS.length; directionIndex += 1) {
		const definition = WORD_SEARCH_DIRECTIONS[(directionOffset + wordIndex * 3 + directionIndex) % WORD_SEARCH_DIRECTIONS.length];
		const candidates = [];
		for (let row = 0; row < WORD_SEARCH_SIZE; row += 1) {
			for (let col = 0; col < WORD_SEARCH_SIZE; col += 1) {
				const cells = Array.from({ length: word.length }, (_, index) => ({ row: row + definition.rowStep * index, col: col + definition.colStep * index }));
				if (cells.some((cell) => cell.row < 0 || cell.row >= WORD_SEARCH_SIZE || cell.col < 0 || cell.col >= WORD_SEARCH_SIZE)) continue;
				if (cells.some((cell, index) => grid[cell.row]?.[cell.col] !== '' && grid[cell.row]?.[cell.col] !== word[index])) continue;
				candidates.push(cells);
			}
		}
		const cells = shuffle(candidates, random)[0];
		if (cells === undefined) continue;
		for (const [index, cell] of cells.entries()) grid[cell.row][cell.col] = word[index];
		return { direction: definition.direction, cells };
	}
	return null;
}

function buildParoliereGrid(challengeId: ChallengeId, target: string): readonly (readonly string[])[] {
	const random = createSeededRandom(`${challengeId}:paroliere-grid`);
	const grid = Array.from({ length: PAROLIERE_SIZE }, () => Array.from({ length: PAROLIERE_SIZE }, () => randomLetter(random)));
	const normalizedTarget = normalizeLetters(target);
	const path = findParolierePath(normalizedTarget.length, random);
	if (path === null) throw new Error(`Unable to place daily Paroliere word ${target}`);
	for (const [index, cell] of path.entries()) grid[cell.row][cell.col] = normalizedTarget[index];
	return grid;
}

function findParolierePath(length: number, random: SeededRandom): readonly { readonly row: number; readonly col: number }[] | null {
	const cells = shuffle(
		Array.from({ length: PAROLIERE_SIZE * PAROLIERE_SIZE }, (_, index) => ({ row: Math.floor(index / PAROLIERE_SIZE), col: index % PAROLIERE_SIZE })),
		random,
	);
	const visit = (path: { row: number; col: number }[], used: Set<string>): readonly { readonly row: number; readonly col: number }[] | null => {
		if (path.length === length) return path;
		const last = path[path.length - 1];
		if (last === undefined) return null;
		const neighbors = shuffle(
			cells.filter((cell) => Math.max(Math.abs(cell.row - last.row), Math.abs(cell.col - last.col)) === 1 && !used.has(cellKey(cell))),
			random,
		);
		for (const neighbor of neighbors) {
			const key = cellKey(neighbor);
			used.add(key);
			const result = visit([...path, neighbor], used);
			if (result !== null) return result;
			used.delete(key);
		}
		return null;
	};
	for (const start of cells) {
		const result = visit([start], new Set([cellKey(start)]));
		if (result !== null) return result;
	}
	return null;
}

function rotateLetters(value: string): readonly string[] {
	const letters = [...value];
	const first = letters.shift();
	return first === undefined ? letters : [...letters, first];
}

function buildThemeQuiz(theme: DailyCatalogTheme): ThemeQuizData {
	return {
		prompt: 'Quale tema nascosto collega i cinque giochi di oggi?',
		choices: theme.choices,
		answerIndex: theme.answerIndex,
	};
}

function rotate<T>(items: readonly [T, T, T], offset: number): readonly [T, T, T] {
	const first = items[offset % items.length] ?? items[0];
	const second = items[(offset + 1) % items.length] ?? items[1];
	const third = items[(offset + 2) % items.length] ?? items[2];
	return [first, second, third];
}

function insertAnswer(answer: string, distractors: readonly [string, string, string], answerIndex: number): readonly [string, string, string, string] {
	if (answerIndex === 0) return [answer, distractors[0], distractors[1], distractors[2]];
	if (answerIndex === 1) return [distractors[0], answer, distractors[1], distractors[2]];
	if (answerIndex === 2) return [distractors[0], distractors[1], answer, distractors[2]];
	return [distractors[0], distractors[1], distractors[2], answer];
}

function hashIndex(value: string, size: number): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return Math.abs(hash) % size;
}

function hashValue(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return hash >>> 0;
}

function createSeededRandom(seed: string): SeededRandom {
	let state = hashValue(seed) || 0x9e3779b9;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function randomIndex(random: SeededRandom, size: number): number {
	return Math.floor(random() * size);
}

function randomLetter(random: SeededRandom): string {
	return ITALIAN_LETTERS[randomIndex(random, ITALIAN_LETTERS.length)] ?? 'A';
}

function normalizeLetters(value: string): string {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
}

function shuffle<T>(values: readonly T[], random: SeededRandom): T[] {
	const result = [...values];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = randomIndex(random, index + 1);
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}
	return result;
}

function cellKey(cell: { readonly row: number; readonly col: number }): string {
	return `${cell.row}:${cell.col}`;
}
