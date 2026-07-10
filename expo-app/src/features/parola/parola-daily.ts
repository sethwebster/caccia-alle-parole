import { wordleWords } from '@/data/wordle-data';
import { dailyPuzzleAdapters } from '@/features/daily/adapters';
import { resolveDailyChallengeBundle, type DailyCatalogBundle, type DailyCatalogPuzzleSpec } from '@/features/daily/catalog';
import { type PuzzleTerminalMutation, dailyProgressMutationQueue, type DailyProgressMutationQueue } from '@/features/daily/progress';
import type { ChallengeId, ChallengeSource, TerminalAttemptContext, TerminalReason } from '@/features/daily/types';
import type { Word, WordleState } from '@/lib/types';

import { normalizeWord } from './parola-logic';

const LEGACY_WORDLE_STORAGE_KEY = 'wordleGameState';

type StorageAdapter = {
	readonly getItem: (key: string) => Promise<string | null>;
};

export type ParolaChallengeState = {
	readonly bundle: DailyCatalogBundle;
	readonly puzzle: DailyCatalogPuzzleSpec;
	readonly state: WordleState;
};

export type LegacyParolaMigrationResult =
	| { readonly kind: 'migrated' }
	| { readonly kind: 'ignored'; readonly reason: 'missing' | 'corrupt' | 'mismatch' | 'nonTerminal' };

export class ParolaDailyCatalogError extends Error {
	readonly name = 'ParolaDailyCatalogError';

	constructor(readonly challengeId: ChallengeId) {
		super(`Paròle challenge is unavailable for ${challengeId}`);
	}
}

export class ParolaDailyAttemptKindError extends Error {
	readonly name = 'ParolaDailyAttemptKindError';

	constructor(readonly attemptKind: TerminalAttemptContext['attemptKind']) {
		super(`Expected official Paròle attempt, received ${attemptKind}`);
	}
}

export function createParolaChallengeState(input: { readonly challengeId: ChallengeId; readonly today?: Date }): ParolaChallengeState {
	const resolution = resolveDailyChallengeBundle(input);
	if (resolution.kind !== 'ready') throw new ParolaDailyCatalogError(input.challengeId);
	const puzzle = parolaPuzzle(resolution.bundle);
	return { bundle: resolution.bundle, puzzle, state: stateFromPuzzle(input.challengeId, puzzle) };
}

export function recordParolaChallengeTerminal(input: {
	readonly queue?: DailyProgressMutationQueue;
	readonly reason: TerminalReason;
	readonly context: TerminalAttemptContext;
	readonly completedAt: Date;
	readonly source: ChallengeSource;
	readonly migrationStatus?: PuzzleTerminalMutation['migrationStatus'];
}) {
	const terminal = dailyPuzzleAdapters.parola.handleTerminal(input.reason, input.context);
	return (input.queue ?? dailyProgressMutationQueue).recordPuzzleTerminal({
		...terminal.context,
		reason: terminal.reason,
		completedAt: input.completedAt,
		source: input.source,
		migrationStatus: input.migrationStatus,
	});
}

export function recordOfficialParolaChallengeTerminal(input: {
	readonly queue?: DailyProgressMutationQueue;
	readonly reason: TerminalReason;
	readonly context: TerminalAttemptContext;
	readonly completedAt: Date;
	readonly source: ChallengeSource;
}) {
	if (input.context.attemptKind !== 'official') throw new ParolaDailyAttemptKindError(input.context.attemptKind);
	return recordParolaChallengeTerminal(input);
}

export async function migrateLegacyParolaState(input: {
	readonly storage: StorageAdapter;
	readonly queue?: DailyProgressMutationQueue;
	readonly challengeId: ChallengeId;
	readonly attemptId: string;
	readonly terminalEventId: string;
	readonly completedAt: Date;
}): Promise<LegacyParolaMigrationResult> {
	const challenge = createParolaChallengeState({ challengeId: input.challengeId });
	const raw = await input.storage.getItem(LEGACY_WORDLE_STORAGE_KEY);
	if (raw === null) return { kind: 'ignored', reason: 'missing' };
	const legacy = parseLegacyState(raw);
	if (legacy === null) return { kind: 'ignored', reason: 'corrupt' };
	if (legacy.date !== input.challengeId || legacy.targetWord !== challenge.state.targetWord) return { kind: 'ignored', reason: 'mismatch' };
	if (legacy.gameState === 'playing') return { kind: 'ignored', reason: 'nonTerminal' };
	const result = await recordParolaChallengeTerminal({
		queue: input.queue,
		reason: legacy.gameState === 'won' ? 'win' : 'loss',
		context: {
			challengeId: input.challengeId,
			puzzleKey: 'parola',
			attemptKind: 'official',
			attemptId: input.attemptId,
			terminalEventId: input.terminalEventId,
		},
		completedAt: input.completedAt,
		source: challenge.bundle.source,
		migrationStatus: 'migrated',
	});
	return result.ok ? { kind: 'migrated' } : { kind: 'ignored', reason: 'corrupt' };
}

function parolaPuzzle(bundle: DailyCatalogBundle): DailyCatalogPuzzleSpec {
	const puzzle = bundle.puzzles.find((candidate) => candidate.key === 'parola');
	if (puzzle === undefined) throw new ParolaDailyCatalogError(bundle.challengeId);
	return puzzle;
}

export function stateFromPuzzle(challengeId: ChallengeId, puzzle: DailyCatalogPuzzleSpec): WordleState {
	const targetWord = normalizeWord(puzzle.target.toUpperCase());
	return {
		targetWord,
		targetWordData: wordDataForPuzzle(puzzle),
		guesses: [],
		currentGuess: '',
		gameState: 'playing',
		keyboardState: {},
		date: challengeId,
	};
}

function wordDataForPuzzle(puzzle: DailyCatalogPuzzleSpec): Word {
	return wordleWords.find((word) => normalizeWord(word.word.toUpperCase()) === normalizeWord(puzzle.target.toUpperCase())) ?? {
		word: puzzle.target,
		translation: puzzle.themeLink,
		definition: puzzle.themeLink,
	};
}

type LegacyWordleTerminalState = {
	readonly date: string;
	readonly targetWord: string;
	readonly gameState: 'playing' | 'won' | 'lost';
};

function parseLegacyState(raw: string): LegacyWordleTerminalState | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		if (error instanceof SyntaxError) return null;
		throw error;
	}
	if (!isRecord(parsed)) return null;
	if (typeof parsed.date !== 'string') return null;
	if (parsed.gameState !== 'playing' && parsed.gameState !== 'won' && parsed.gameState !== 'lost') return null;
	const target = targetFromLegacy(parsed);
	return target === null ? null : { date: parsed.date, targetWord: target, gameState: parsed.gameState };
}

function targetFromLegacy(record: Record<string, unknown>): string | null {
	if (typeof record.targetWord === 'string') return normalizeWord(record.targetWord.toUpperCase());
	if (isRecord(record.targetWordData) && typeof record.targetWordData.word === 'string') {
		return normalizeWord(record.targetWordData.word.toUpperCase());
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
