import type { TerminalReason } from '@/features/daily/types';

import { normalizeLetters, type AnagrammiState, type Round, type RoundStatus } from './anagrammi-service';

export type AnagrammiChallengePayload = {
	readonly targetWord: string;
	readonly tiles: readonly string[];
	readonly translation: string;
	readonly definition: string;
	readonly category: string;
	readonly durationSeconds: number;
};

export type AnagrammiChallengeSummary = {
	readonly puzzleKey: 'anagrammi';
	readonly status: RoundStatus;
	readonly terminalReason: TerminalReason;
	readonly targetWord: string;
	readonly tiles: readonly string[];
	readonly translation: string;
	readonly definition: string;
	readonly category: string;
	readonly score: number;
	readonly hintsUsed: number;
	readonly durationSeconds: number;
};

type AnagrammiChallengeState = AnagrammiState & { readonly challengeDurationSeconds: number };

export class AnagrammiChallengeValidationError extends Error {
	readonly name = 'AnagrammiChallengeValidationError';

	constructor(readonly field: keyof AnagrammiChallengePayload) {
		super(`anagrammi invalid ${field}`);
	}
}

export function createAnagrammiChallengeRound(payload: AnagrammiChallengePayload): Round {
	const targetWord = parseChallengeTarget(payload.targetWord);
	const tiles = payload.tiles.map(parseChallengeTile);
	if (sortLetters(tiles.join('')) !== sortLetters(targetWord)) throw new AnagrammiChallengeValidationError('tiles');
	return {
		targetWord,
		tiles,
		translation: parseChallengeText(payload.translation, 'translation'),
		definition: parseChallengeText(payload.definition, 'definition'),
		category: parseChallengeText(payload.category, 'category'),
	};
}

export function createAnagrammiChallengeState(payload: AnagrammiChallengePayload, now: number): AnagrammiChallengeState {
	return {
		status: 'playing',
		round: createAnagrammiChallengeRound(payload),
		picked: [],
		score: 0,
		streak: 0,
		hintsUsed: 0,
		deadline: now + parseDurationMs(payload.durationSeconds),
		challengeDurationSeconds: payload.durationSeconds,
	};
}

export function createAnagrammiChallengeSummary(state: AnagrammiChallengeState, terminalReason: TerminalReason): AnagrammiChallengeSummary {
	return {
		puzzleKey: 'anagrammi',
		status: state.status,
		terminalReason,
		targetWord: state.round.targetWord,
		tiles: state.round.tiles,
		translation: state.round.translation,
		definition: state.round.definition,
		category: state.round.category,
		score: state.score,
		hintsUsed: state.hintsUsed,
		durationSeconds: state.challengeDurationSeconds,
	};
}

function parseChallengeTarget(value: string): string {
	if (value.length === 0 || value !== value.toUpperCase()) throw new AnagrammiChallengeValidationError('targetWord');
	return value;
}

function parseChallengeTile(value: string): string {
	if (!/^[A-ZÀ-Ù]$/.test(value)) throw new AnagrammiChallengeValidationError('tiles');
	return value;
}

function parseChallengeText(value: string, field: 'translation' | 'definition' | 'category'): string {
	if (value.length === 0) throw new AnagrammiChallengeValidationError(field);
	return value;
}

function parseDurationMs(durationSeconds: number): number {
	if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) throw new AnagrammiChallengeValidationError('durationSeconds');
	return durationSeconds * 1_000;
}

function sortLetters(value: string): string {
	return [...normalizeLetters(value).replace(/\s+/g, '').toUpperCase()].sort().join('');
}
