import type { Difficulty, Direction } from '@/lib/types';

import { THEMES, type ThemeSeed } from './catalog-content';
import { CANONICAL_PUZZLE_LABELS, type ChallengeId, type DailyPuzzleKey, type DailyPuzzleSpec, type ThemeQuizData } from './types';

const GENERATOR_VERSION = 'daily-catalog-generator-v1';
const DICTIONARY_VERSION = 'it-bundled-v1';

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

export function pickCatalogTheme(challengeId: ChallengeId): ThemeSeed {
	return THEMES[hashIndex(`${challengeId}:theme`, THEMES.length)] ?? THEMES[0];
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
	const target = words[hashIndex(`${challengeId}:${key}`, words.length)] ?? words[0];
	return {
		key,
		label: CANONICAL_PUZZLE_LABELS[key],
		themeQuiz: buildThemeQuiz(theme),
		themeId: theme.themeId,
		themeLink: `${CANONICAL_PUZZLE_LABELS[key]} collega ${target} a ${theme.label}`,
		generatorVersion: GENERATOR_VERSION,
		dictionaryVersion: DICTIONARY_VERSION,
		target,
		payload: buildPuzzlePayload(key, themeSeed, target, theme),
	};
}

function buildPuzzlePayload(key: DailyPuzzleKey, seed: ThemeSeed, target: string, theme: DailyCatalogTheme): DailyCatalogPuzzlePayload {
	switch (key) {
		case 'parola':
			return { targetWord: target, maxAttempts: 6 };
		case 'caccia':
			return buildCacciaPayload(seed.puzzleWords.caccia, theme);
		case 'paroliere':
			return { grid: squareGrid(seed.puzzleWords.paroliere.join(''), 4), durationSeconds: 180 };
		case 'impiccato':
			return { targetWord: target, targetCategory: theme.label, targetTranslation: theme.label, targetDefinition: theme.explanation, lives: 6 };
		case 'anagrammi':
			return { targetWord: target, tiles: rotateLetters(target), translation: theme.label, definition: theme.explanation, category: theme.label, durationSeconds: 60 };
	}
}

function buildCacciaPayload(words: readonly [string, string, string], theme: DailyCatalogTheme): Extract<DailyCatalogPuzzlePayload, { readonly category: string }> {
	const width = Math.max(...words.map((word) => word.length));
	const grid = words.map((word) => [...word.padEnd(width, 'A')]);
	return {
		category: theme.label,
		difficulty: 'easy',
		grid,
		words: words.map((word, row) => ({
			word,
			translation: theme.label,
			definition: theme.explanation,
			row,
			col: 0,
			direction: 'horizontal',
			points: word.length * 10,
			cells: [...word].map((_, col) => ({ row, col })),
		})),
	};
}

function squareGrid(value: string, size: number): readonly (readonly string[])[] {
	const letters = value.padEnd(size * size, 'A').slice(0, size * size);
	return Array.from({ length: size }, (_, row) => [...letters.slice(row * size, row * size + size)]);
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
	for (let index = 0; index < value.length; index += 1) {
		hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	}
	return Math.abs(hash) % size;
}
