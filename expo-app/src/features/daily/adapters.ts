import type { Difficulty, Direction, PlacedWord } from '@/lib/types';
import { createAnagrammiChallengeState } from '@/features/anagrammi/anagrammi-daily';

import { CANONICAL_PUZZLE_LABELS, TERMINAL_REASONS, type DailyPuzzleKey, type DailyPuzzleSpec, type TerminalAttemptContext, type TerminalReason } from './types';

type Provenance = {
	readonly generatorVersion: string;
	readonly dictionaryVersion: string;
};

type AdapterSpec<Key extends DailyPuzzleKey, Payload> = DailyPuzzleSpec & Provenance & {
	readonly key: Key;
	readonly payload: Payload;
};

type ParolaPayload = { readonly targetWord: string; readonly maxAttempts: number };
type CacciaPayload = { readonly category: string; readonly difficulty: Difficulty; readonly grid: readonly (readonly string[])[]; readonly words: readonly PlacedWord[] };
type ParolierePayload = { readonly grid: readonly (readonly string[])[]; readonly durationSeconds: number };
type ImpiccatoPayload = { readonly targetWord: string; readonly targetCategory: string; readonly targetTranslation: string; readonly targetDefinition: string; readonly lives: number };
type AnagrammiPayload = { readonly targetWord: string; readonly tiles: readonly string[]; readonly translation: string; readonly definition: string; readonly category: string; readonly durationSeconds: number };

export type DailyAdapterInput =
	| AdapterSpec<'parola', ParolaPayload>
	| AdapterSpec<'caccia', CacciaPayload>
	| AdapterSpec<'paroliere', ParolierePayload>
	| AdapterSpec<'impiccato', ImpiccatoPayload>
	| AdapterSpec<'anagrammi', AnagrammiPayload>;

export type DailyAdapterSummary = Provenance & {
	readonly puzzleKey: DailyPuzzleKey;
	readonly label: string;
	readonly status: 'notStarted';
	readonly score: number;
	readonly completedUnits: number;
	readonly totalUnits: number;
};

export type DailyAdapterInitialization = {
	readonly state: Record<string, unknown>;
	readonly summary: DailyAdapterSummary;
	readonly provenance: Provenance;
};

export type DailyTerminalResult = {
	readonly puzzleKey: DailyPuzzleKey;
	readonly reason: TerminalReason;
	readonly context: TerminalAttemptContext;
};

type BaseSpec = Omit<DailyPuzzleSpec, 'key'> & Provenance;

export class DailyAdapterValidationError extends Error {
	readonly name = 'DailyAdapterValidationError';

	constructor(readonly puzzleKey: DailyPuzzleKey, readonly field: string) {
		super(`${puzzleKey} invalid ${field}`);
	}
}

export class DailyTerminalContextError extends Error {
	readonly name = 'DailyTerminalContextError';

	constructor(readonly field: string) {
		super(`Invalid terminal ${field}`);
	}
}

type DailyPuzzleAdapter<Key extends DailyPuzzleKey> = {
	readonly key: Key;
	parseSpec(input: unknown): Extract<DailyAdapterInput, { readonly key: Key }>;
	initialize(spec: Extract<DailyAdapterInput, { readonly key: Key }>): DailyAdapterInitialization;
	handleTerminal(reason: unknown, context: Partial<TerminalAttemptContext>): DailyTerminalResult;
};

export const dailyPuzzleAdapters = {
	parola: makeAdapter('parola', parseParolaSpec, initializeParola),
	caccia: makeAdapter('caccia', parseCacciaSpec, initializeCaccia),
	paroliere: makeAdapter('paroliere', parseParoliereSpec, initializeParoliere),
	impiccato: makeAdapter('impiccato', parseImpiccatoSpec, initializeImpiccato),
	anagrammi: makeAdapter('anagrammi', parseAnagrammiSpec, initializeAnagrammi),
} satisfies { readonly [Key in DailyPuzzleKey]: DailyPuzzleAdapter<Key> };

function makeAdapter<Key extends DailyPuzzleKey, Spec extends Extract<DailyAdapterInput, { readonly key: Key }>>(
	key: Key,
	parseSpec: (input: unknown) => Spec,
	initialize: (spec: Spec) => DailyAdapterInitialization,
): DailyPuzzleAdapter<Key> {
	return {
		key,
		parseSpec,
		initialize,
		handleTerminal: (reason, context) => buildTerminalResult(key, reason, context),
	};
}

function parseParolaSpec(input: unknown): AdapterSpec<'parola', ParolaPayload> {
	return { ...parseBaseSpec(input, 'parola'), key: 'parola', payload: parseParolaPayload(recordField(input, 'payload', 'parola'), 'parola') };
}

function parseCacciaSpec(input: unknown): AdapterSpec<'caccia', CacciaPayload> {
	return { ...parseBaseSpec(input, 'caccia'), key: 'caccia', payload: parseCacciaPayload(recordField(input, 'payload', 'caccia'), 'caccia') };
}

function parseParoliereSpec(input: unknown): AdapterSpec<'paroliere', ParolierePayload> {
	return { ...parseBaseSpec(input, 'paroliere'), key: 'paroliere', payload: parseParolierePayload(recordField(input, 'payload', 'paroliere'), 'paroliere') };
}

function parseImpiccatoSpec(input: unknown): AdapterSpec<'impiccato', ImpiccatoPayload> {
	return { ...parseBaseSpec(input, 'impiccato'), key: 'impiccato', payload: parseImpiccatoPayload(recordField(input, 'payload', 'impiccato'), 'impiccato') };
}

function parseAnagrammiSpec(input: unknown): AdapterSpec<'anagrammi', AnagrammiPayload> {
	return { ...parseBaseSpec(input, 'anagrammi'), key: 'anagrammi', payload: parseAnagrammiPayload(recordField(input, 'payload', 'anagrammi'), 'anagrammi') };
}

function parseBaseSpec(input: unknown, key: DailyPuzzleKey): BaseSpec {
	const record = ensureRecord(input, key, 'spec');
	if (record.key !== key) throw new DailyAdapterValidationError(key, 'key');
	if (record.label !== CANONICAL_PUZZLE_LABELS[key]) throw new DailyAdapterValidationError(key, 'label');
	return {
		label: CANONICAL_PUZZLE_LABELS[key],
		generatorVersion: stringField(record, key, 'generatorVersion'),
		dictionaryVersion: stringField(record, key, 'dictionaryVersion'),
		themeQuiz: parseThemeQuiz(recordField(input, 'themeQuiz', key), key),
	};
}

function initializeParola(spec: AdapterSpec<'parola', ParolaPayload>): DailyAdapterInitialization {
	return init(spec, { targetWord: spec.payload.targetWord, guesses: [], maxAttempts: spec.payload.maxAttempts, gameState: 'playing' }, spec.payload.targetWord.length);
}

function initializeCaccia(spec: AdapterSpec<'caccia', CacciaPayload>): DailyAdapterInitialization {
	return init(spec, { category: spec.payload.category, difficulty: spec.payload.difficulty, grid: spec.payload.grid, words: spec.payload.words, foundWords: [], score: 0 }, spec.payload.words.length);
}

function initializeParoliere(spec: AdapterSpec<'paroliere', ParolierePayload>): DailyAdapterInitialization {
	return init(spec, { grid: spec.payload.grid, foundWords: [], currentPath: [], score: 0, timeLeft: spec.payload.durationSeconds, gameState: 'setup' }, 1);
}

function initializeImpiccato(spec: AdapterSpec<'impiccato', ImpiccatoPayload>): DailyAdapterInitialization {
	return init(spec, { targetWord: spec.payload.targetWord, targetCategory: spec.payload.targetCategory, targetTranslation: spec.payload.targetTranslation, targetDefinition: spec.payload.targetDefinition, guessedLetters: [], remainingLives: spec.payload.lives, gameState: 'playing', score: 0 }, spec.payload.targetWord.length);
}

function initializeAnagrammi(spec: AdapterSpec<'anagrammi', AnagrammiPayload>): DailyAdapterInitialization {
	return init(spec, createAnagrammiChallengeState(spec.payload, 0), spec.payload.targetWord.length);
}

function init(spec: DailyAdapterInput, state: Record<string, unknown>, totalUnits: number): DailyAdapterInitialization {
	const provenance = { generatorVersion: spec.generatorVersion, dictionaryVersion: spec.dictionaryVersion };
	return { state, provenance, summary: { puzzleKey: spec.key, label: spec.label, status: 'notStarted', score: 0, completedUnits: 0, totalUnits, ...provenance } };
}

function parseParolaPayload(value: unknown, key: 'parola'): ParolaPayload {
	const record = ensureRecord(value, key, 'payload');
	return { targetWord: uppercaseWord(record, key, 'targetWord'), maxAttempts: positiveIntegerField(record, key, 'maxAttempts') };
}

function parseCacciaPayload(value: unknown, key: 'caccia'): CacciaPayload {
	const record = ensureRecord(value, key, 'payload');
	const words = arrayField(record, key, 'words').map((word) => parsePlacedWord(word, key));
	if (words.length === 0) throw new DailyAdapterValidationError(key, 'words');
	const normalizedWords = words.map((word) => normalizeWord(word.word));
	if (new Set(normalizedWords).size !== normalizedWords.length) throw new DailyAdapterValidationError(key, 'words');
	return { category: stringField(record, key, 'category'), difficulty: difficultyField(record, key, 'difficulty'), grid: parseStringGrid(recordField(record, 'grid', key), key, 'grid'), words };
}

function parseParolierePayload(value: unknown, key: 'paroliere'): ParolierePayload {
	const record = ensureRecord(value, key, 'payload');
	const grid = parseStringGrid(recordField(record, 'grid', key), key, 'grid');
	if (grid.length !== 4 || grid.some((row) => row.length !== 4)) throw new DailyAdapterValidationError(key, 'grid');
	return { grid, durationSeconds: positiveIntegerField(record, key, 'durationSeconds') };
}

function parseImpiccatoPayload(value: unknown, key: 'impiccato'): ImpiccatoPayload {
	const record = ensureRecord(value, key, 'payload');
	return { targetWord: uppercaseWord(record, key, 'targetWord'), targetCategory: stringField(record, key, 'targetCategory'), targetTranslation: stringField(record, key, 'targetTranslation'), targetDefinition: stringField(record, key, 'targetDefinition'), lives: positiveIntegerField(record, key, 'lives') };
}

function parseAnagrammiPayload(value: unknown, key: 'anagrammi'): AnagrammiPayload {
	const record = ensureRecord(value, key, 'payload');
	const targetWord = uppercaseWord(record, key, 'targetWord');
	const tiles = arrayField(record, key, 'tiles').map((tile) => parseUppercaseTile(tile, key, 'tiles'));
	if (sortLetters(tiles.join('')) !== sortLetters(targetWord)) throw new DailyAdapterValidationError(key, 'tiles');
	return { targetWord, tiles, translation: stringField(record, key, 'translation'), definition: stringField(record, key, 'definition'), category: stringField(record, key, 'category'), durationSeconds: positiveIntegerField(record, key, 'durationSeconds') };
}

function buildTerminalResult(key: DailyPuzzleKey, reason: unknown, context: Partial<TerminalAttemptContext>): DailyTerminalResult {
	if (!isTerminalReasonValue(reason)) throw new DailyTerminalContextError('terminal reason');
	if (!isTerminalContextForKey(context, key)) return rejectTerminalContext(context, key);
	return { puzzleKey: key, reason, context };
}

function rejectTerminalContext(context: Partial<TerminalAttemptContext>, key: DailyPuzzleKey): never {
	if (context.puzzleKey !== key) throw new DailyTerminalContextError('puzzleKey');
	if (context.attemptKind !== 'official' && context.attemptKind !== 'replay') throw new DailyTerminalContextError('attemptKind');
	if (!isNonEmptyText(context.challengeId)) throw new DailyTerminalContextError('challengeId');
	if (typeof context.attemptId !== 'string' || context.attemptId.length === 0) throw new DailyTerminalContextError('attemptId');
	throw new DailyTerminalContextError('terminalEventId');
}

function isTerminalContextForKey(context: Partial<TerminalAttemptContext>, key: DailyPuzzleKey): context is TerminalAttemptContext {
	return context.puzzleKey === key && (context.attemptKind === 'official' || context.attemptKind === 'replay') && isNonEmptyText(context.challengeId) && isNonEmptyText(context.attemptId) && isNonEmptyText(context.terminalEventId);
}

function parseThemeQuiz(value: unknown, key: DailyPuzzleKey): DailyPuzzleSpec['themeQuiz'] {
	const record = ensureRecord(value, key, 'themeQuiz');
	const choices = arrayField(record, key, 'choices').map((choice) => parseText(choice, key, 'choices'));
	const answerIndex = positiveIntegerOrZeroField(record, key, 'answerIndex');
	if (answerIndex >= choices.length) throw new DailyAdapterValidationError(key, 'themeQuiz');
	return { prompt: stringField(record, key, 'prompt'), choices, answerIndex };
}

function parsePlacedWord(value: unknown, key: 'caccia'): PlacedWord {
	const record = ensureRecord(value, key, 'words');
	return { word: stringField(record, key, 'word'), translation: stringField(record, key, 'translation'), definition: stringField(record, key, 'definition'), row: 0, col: 0, direction: 'horizontal' satisfies Direction, points: positiveIntegerField(record, key, 'points'), cells: arrayField(record, key, 'cells').map((cell) => parseCellPosition(cell, key)) };
}

function parseCellPosition(value: unknown, key: DailyPuzzleKey): { readonly row: number; readonly col: number } {
	const record = ensureRecord(value, key, 'cells');
	return { row: positiveIntegerOrZeroField(record, key, 'row'), col: positiveIntegerOrZeroField(record, key, 'col') };
}

function parseStringGrid(value: unknown, key: DailyPuzzleKey, field: string): readonly (readonly string[])[] {
	const rows = arrayValue(value, key, field).map((row) => arrayValue(row, key, field).map((cell) => parseUppercaseTile(cell, key, field)));
	if (rows.length === 0 || rows.some((row) => row.length !== rows[0]?.length)) throw new DailyAdapterValidationError(key, field);
	return rows;
}

function ensureRecord(value: unknown, key: DailyPuzzleKey, field: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new DailyAdapterValidationError(key, field);
	return value as Record<string, unknown>;
}

function recordField(value: unknown, field: string, key: DailyPuzzleKey): unknown {
	return ensureRecord(value, key, field)[field];
}

function arrayField(record: Record<string, unknown>, key: DailyPuzzleKey, field: string): readonly unknown[] {
	return arrayValue(record[field], key, field);
}

function arrayValue(value: unknown, key: DailyPuzzleKey, field: string): readonly unknown[] {
	if (!Array.isArray(value)) throw new DailyAdapterValidationError(key, field);
	return value;
}

function stringField(record: Record<string, unknown>, key: DailyPuzzleKey, field: string): string {
	return parseText(record[field], key, field);
}

function parseText(value: unknown, key: DailyPuzzleKey, field: string): string {
	if (!isNonEmptyText(value)) throw new DailyAdapterValidationError(key, field);
	return value;
}

function isNonEmptyText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function uppercaseWord(record: Record<string, unknown>, key: DailyPuzzleKey, field: string): string {
	const value = stringField(record, key, field);
	if (value !== value.toUpperCase()) throw new DailyAdapterValidationError(key, field);
	return value;
}

function parseUppercaseTile(value: unknown, key: DailyPuzzleKey, field: string): string {
	if (typeof value !== 'string' || !/^[A-ZÀ-Ù]$/.test(value)) throw new DailyAdapterValidationError(key, field);
	return value;
}

function positiveIntegerField(record: Record<string, unknown>, key: DailyPuzzleKey, field: string): number {
	const value = record[field];
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw new DailyAdapterValidationError(key, field);
	return value;
}

function positiveIntegerOrZeroField(record: Record<string, unknown>, key: DailyPuzzleKey, field: string): number {
	const value = record[field];
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new DailyAdapterValidationError(key, field);
	return value;
}

function difficultyField(record: Record<string, unknown>, key: 'caccia', field: string): Difficulty {
	switch (record[field]) {
		case 'easy':
		case 'medium':
		case 'hard':
			return record[field];
		default:
			throw new DailyAdapterValidationError(key, field);
	}
}

function isTerminalReasonValue(value: unknown): value is TerminalReason {
	return typeof value === 'string' && TERMINAL_REASONS.includes(value as TerminalReason);
}

function normalizeWord(value: string): string {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
}

function sortLetters(value: string): string {
	return [...normalizeWord(value)].sort().join('');
}
