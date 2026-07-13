import { DailyAdapterValidationError, dailyPuzzleAdapters } from './adapters';
import type { DailyCatalogBundle, DailyCatalogPuzzlePayload, DailyCatalogPuzzleSpec } from './catalog';
import { makeCatalogEpoch, makeCatalogVersion, makeReleaseBaseChallengeId } from './date';
import type { ChallengeSource, DailyPuzzleKey, ReleaseBaseChallengeId, ThemeQuizData, TerminalReason } from './types';
import {
	DAILY_PROGRESS_SCHEMA_VERSION,
	emptyDailyProgress,
	makeProgressReady,
	parseChallengeId,
	parseStreakDate,
	type CompletionCreditRecord,
	type DailyChallengeProgressRecord,
	type DailyProgress,
	type PuzzleProgressSnapshot,
	type ReplayProgressAttempt,
	type TerminalProgressEvent,
	type ThemeQuizResult,
} from './progress-model';

const PUZZLE_KEYS = ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const;
const TERMINAL_REASONS = ['win', 'loss', 'skip', 'giveUp'] as const;

export function parseDailyProgress(value: unknown): DailyProgress | null {
	if (!isRecord(value)) return null;
	if (value.schemaVersion !== DAILY_PROGRESS_SCHEMA_VERSION) return null;
	if (!Array.isArray(value.challenges) || !Array.isArray(value.credits) || !Array.isArray(value.mutationEventIds)) return null;
	const challenges = parseArray(value.challenges, parseChallengeRecord);
	const credits = parseArray(value.credits, parseCredit);
	const mutationEventIds = parseStringArray(value.mutationEventIds);
	if (challenges === null || credits === null || mutationEventIds === null) return null;
	return makeProgressReady({ schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION, challenges, credits, mutationEventIds });
}

function parseChallengeRecord(value: unknown): DailyChallengeProgressRecord | null {
	if (!isRecord(value)) return null;
	const challengeId = parseChallengeId(value.challengeId);
	const migrationStatus = parseMigrationStatus(value.migrationStatus);
	const inProgressPuzzles = Array.isArray(value.inProgressPuzzles) ? parseArray(value.inProgressPuzzles, parsePuzzleProgress) : null;
	const replayAttempts = Array.isArray(value.replayAttempts) ? parseArray(value.replayAttempts, parseReplayAttempt) : null;
	const officialAttempt = value.officialAttempt === undefined ? undefined : parseOfficialAttempt(value.officialAttempt);
	const themeQuizResult = value.themeQuizResult === undefined ? undefined : parseThemeQuizResult(value.themeQuizResult);
	const bundleSnapshot = value.bundleSnapshot === undefined ? undefined : parseCatalogBundleSnapshot(value.bundleSnapshot);
	if (challengeId === null || migrationStatus === null || inProgressPuzzles === null || replayAttempts === null) return null;
	if (value.officialAttempt !== undefined && officialAttempt === null) return null;
	if (value.themeQuizResult !== undefined && themeQuizResult === null) return null;
	if (value.bundleSnapshot !== undefined && bundleSnapshot === null) return null;
	return {
		challengeId,
		source: isChallengeSource(value.source) ? value.source : null,
		bundleSnapshot: bundleSnapshot ?? undefined,
		migrationStatus,
		officialAttempt: officialAttempt ?? undefined,
		inProgressPuzzles,
		replayAttempts,
		themeQuizResult: themeQuizResult ?? undefined,
	};
}

function parseCatalogBundleSnapshot(value: unknown): DailyCatalogBundle | null {
	if (!isRecord(value) || !Array.isArray(value.puzzles) || !isRecord(value.theme)) return null;
	const challengeId = parseChallengeId(value.challengeId);
	const streakDate = parseStreakDate(value.streakDate);
	const source = parseChallengeSource(value.source);
	const releaseBaseChallengeId = parseReleaseBaseChallengeId(value.releaseBaseChallengeId);
	const catalogEpoch = typeof value.catalogEpoch === 'string' ? makeCatalogEpoch(value.catalogEpoch) : null;
	const catalogVersion = typeof value.catalogVersion === 'string' ? makeCatalogVersion(value.catalogVersion) : null;
	const supportedFromChallengeId = parseChallengeId(value.supportedFromChallengeId);
	const supportedThroughChallengeId = parseChallengeId(value.supportedThroughChallengeId);
	const theme = parseCatalogTheme(value.theme);
	const puzzles = parseArray(value.puzzles, parseCatalogPuzzleSpec);
	if (challengeId === null || streakDate === null || source === null || releaseBaseChallengeId === null || catalogEpoch === null || catalogVersion === null || supportedFromChallengeId === null || supportedThroughChallengeId === null || theme === null || puzzles === null) return null;
	return { challengeId, streakDate, source, releaseBaseChallengeId, catalogEpoch, catalogVersion, supportedFromChallengeId, supportedThroughChallengeId, theme, puzzles };
}

function parseCatalogTheme(value: Record<string, unknown>): DailyCatalogBundle['theme'] | null {
	if (typeof value.themeId !== 'string' || typeof value.label !== 'string' || typeof value.explanation !== 'string') return null;
	if (!Array.isArray(value.choices) || value.choices.length !== 4 || typeof value.answerIndex !== 'number') return null;
	const choices = parseStringArray(value.choices);
	if (choices === null || choices[0] === undefined || choices[1] === undefined || choices[2] === undefined || choices[3] === undefined) return null;
	return { themeId: value.themeId, label: value.label, explanation: value.explanation, choices: [choices[0], choices[1], choices[2], choices[3]], answerIndex: value.answerIndex };
}

function parseCatalogPuzzleSpec(value: unknown): DailyCatalogPuzzleSpec | null {
	if (!isRecord(value)) return null;
	const key = parsePuzzleKey(value.key);
	const themeQuiz = parseThemeQuizData(value.themeQuiz);
	if (key === null || themeQuiz === null) return null;
	if (typeof value.label !== 'string' || typeof value.themeId !== 'string' || typeof value.themeLink !== 'string' || typeof value.generatorVersion !== 'string' || typeof value.dictionaryVersion !== 'string' || typeof value.target !== 'string') return null;
	const base = { key, label: value.label, themeQuiz, themeId: value.themeId, themeLink: value.themeLink, generatorVersion: value.generatorVersion, dictionaryVersion: value.dictionaryVersion, target: value.target };
	const payload = parseCatalogPuzzlePayload(base, value.payload);
	return payload === null ? null : { ...base, payload };
}

function parseCatalogPuzzlePayload(spec: Omit<DailyCatalogPuzzleSpec, 'payload'>, payload: unknown): DailyCatalogPuzzlePayload | null {
	try {
		switch (spec.key) {
			case 'parola':
				return dailyPuzzleAdapters.parola.parseSpec({ ...spec, payload }).payload;
			case 'caccia':
				return dailyPuzzleAdapters.caccia.parseSpec({ ...spec, payload }).payload;
			case 'paroliere':
				return dailyPuzzleAdapters.paroliere.parseSpec({ ...spec, payload }).payload;
			case 'impiccato':
				return dailyPuzzleAdapters.impiccato.parseSpec({ ...spec, payload }).payload;
			case 'anagrammi':
				return dailyPuzzleAdapters.anagrammi.parseSpec({ ...spec, payload }).payload;
		}
	} catch (error) {
		if (error instanceof DailyAdapterValidationError) return null;
		throw error;
	}
}

function parseThemeQuizData(value: unknown): ThemeQuizData | null {
	if (!isRecord(value) || typeof value.prompt !== 'string' || !Array.isArray(value.choices) || typeof value.answerIndex !== 'number') return null;
	const choices = parseStringArray(value.choices);
	return choices === null ? null : { prompt: value.prompt, choices, answerIndex: value.answerIndex };
}

function parseReleaseBaseChallengeId(value: unknown): ReleaseBaseChallengeId | null {
	if (typeof value !== 'string') return null;
	try {
		return makeReleaseBaseChallengeId(value);
	} catch (error) {
		if (error instanceof Error) return null;
		throw error;
	}
}

function parseChallengeSource(value: unknown): ChallengeSource | null {
	if (!isRecord(value) || typeof value.kind !== 'string') return null;
	if (value.kind === 'generatedPreview' && typeof value.label === 'string') return { kind: 'generatedPreview', label: value.label };
	if (value.kind !== 'bundledCatalog' || typeof value.epoch !== 'string' || typeof value.version !== 'string') return null;
	return { kind: 'bundledCatalog', epoch: makeCatalogEpoch(value.epoch), version: makeCatalogVersion(value.version) };
}

function parseOfficialAttempt(value: unknown): DailyChallengeProgressRecord['officialAttempt'] | null {
	if (!isRecord(value) || typeof value.attemptId !== 'string' || !Array.isArray(value.terminalEvents)) return null;
	const terminalEvents = parseArray(value.terminalEvents, parseTerminalEvent);
	return terminalEvents === null ? null : { attemptId: value.attemptId, terminalEvents };
}

function parseReplayAttempt(value: unknown): ReplayProgressAttempt | null {
	if (!isRecord(value) || typeof value.attemptId !== 'string' || !Array.isArray(value.terminalEvents)) return null;
	const terminalEvents = parseArray(value.terminalEvents, parseTerminalEvent);
	return terminalEvents === null ? null : { attemptId: value.attemptId, terminalEvents };
}

function parseTerminalEvent(value: unknown): TerminalProgressEvent | null {
	if (!isRecord(value)) return null;
	if (typeof value.attemptId !== 'string' || typeof value.completedAt !== 'string' || typeof value.terminalEventId !== 'string') return null;
	const puzzleKey = parsePuzzleKey(value.puzzleKey);
	const reason = parseTerminalReason(value.reason);
	return puzzleKey === null || reason === null ? null : { attemptId: value.attemptId, completedAt: value.completedAt, puzzleKey, reason, terminalEventId: value.terminalEventId };
}

function parsePuzzleProgress(value: unknown): PuzzleProgressSnapshot | null {
	if (!isRecord(value) || typeof value.updatedAt !== 'string') return null;
	const puzzleKey = parsePuzzleKey(value.puzzleKey);
	return puzzleKey === null ? null : { puzzleKey, state: value.state, updatedAt: value.updatedAt };
}

function parseCredit(value: unknown): CompletionCreditRecord | null {
	if (!isRecord(value) || typeof value.completedAt !== 'string' || typeof value.creditId !== 'string') return null;
	const challengeId = parseChallengeId(value.challengeId);
	const streakDate = parseStreakDate(value.streakDate);
	return challengeId === null || streakDate === null ? null : { challengeId, completedAt: value.completedAt, creditId: value.creditId, streakDate };
}

function parseThemeQuizResult(value: unknown): ThemeQuizResult | null {
	if (!isRecord(value)) return null;
	if (typeof value.eventId !== 'string' || typeof value.answeredAt !== 'string') return null;
	return typeof value.answerIndex === 'number' && Number.isInteger(value.answerIndex) ? { answerIndex: value.answerIndex, answeredAt: value.answeredAt, eventId: value.eventId } : null;
}

function parseArray<T>(values: readonly unknown[], parser: (value: unknown) => T | null): readonly T[] | null {
	const parsed: T[] = [];
	for (const value of values) {
		const item = parser(value);
		if (item === null) return null;
		parsed.push(item);
	}
	return parsed;
}

function parseStringArray(values: readonly unknown[]): readonly string[] | null {
	return values.every((value) => typeof value === 'string') ? values : null;
}

function parsePuzzleKey(value: unknown): DailyPuzzleKey | null {
	return typeof value === 'string' && PUZZLE_KEYS.includes(value as DailyPuzzleKey) ? (value as DailyPuzzleKey) : null;
}

function parseTerminalReason(value: unknown): TerminalReason | null {
	return typeof value === 'string' && TERMINAL_REASONS.includes(value as TerminalReason) ? (value as TerminalReason) : null;
}

function parseMigrationStatus(value: unknown): DailyChallengeProgressRecord['migrationStatus'] | null {
	return value === 'fresh' || value === 'migrated' || value === 'recovery' ? value : null;
}

function isChallengeSource(value: unknown): value is ChallengeSource {
	if (!isRecord(value) || typeof value.kind !== 'string') return false;
	return value.kind === 'bundledCatalog' || value.kind === 'generatedPreview';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function parseProgressJson(raw: string): DailyProgress | null {
	const parsed: unknown = JSON.parse(raw);
	return parseDailyProgress(parsed);
}

export function progressOrEmpty(raw: string | null): DailyProgress | null {
	return raw === null ? emptyDailyProgress : parseProgressJson(raw);
}
