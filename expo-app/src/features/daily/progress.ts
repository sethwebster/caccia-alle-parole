import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DailyCatalogBundle } from './catalog';
import { evaluateOfficialStreakEligibility } from './contract';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type ChallengeSource, type DailyPuzzleKey, type TerminalAttemptContext, type TerminalReason } from './types';
import { parseProgressJson, progressOrEmpty } from './progress-parse';
import {
	DAILY_PROGRESS_KEY,
	DAILY_PROGRESS_QUARANTINE_KEY,
	emptyDailyProgress,
	hasAllOfficialTerminalEvents,
	makeProgressReady,
	type ArchiveState,
	type DailyChallengeProgressRecord,
	type DailyProgress,
	type DailyProgressLoadState,
	type DailyStatsSummary,
	type ProgressError,
	type ProgressResult,
	type ProgressStorageAdapter,
	type ReplayProgressAttempt,
	type TerminalProgressEvent,
} from './progress-model';

export class DailyStatsLoadError extends Error {
	readonly name = 'DailyStatsLoadError';

	constructor(readonly reason: ProgressError['kind'], message: string) {
		super(message);
	}
}

export type PuzzleTerminalMutation = TerminalAttemptContext & {
	readonly reason: TerminalReason;
	readonly completedAt: Date;
	readonly source: ChallengeSource;
	readonly bundleSnapshot?: DailyCatalogBundle;
	readonly migrationStatus?: DailyChallengeProgressRecord['migrationStatus'];
};

export type PuzzleProgressMutation = {
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly state: unknown;
	readonly source: ChallengeSource;
	readonly bundleSnapshot?: DailyCatalogBundle;
	readonly updatedAt?: Date;
};

export type ThemeQuizMutation = {
	readonly challengeId: ChallengeId;
	readonly eventId: string;
	readonly answerIndex: number;
	readonly answeredAt: Date;
};

export type DailyChallengeStatusSummary = {
	readonly challengeId: ChallengeId;
	readonly status: 'new' | 'playing' | 'completed';
	readonly terminalEvents: number;
	readonly totalPuzzles: number;
};

export function createDailyProgressStore(storage: ProgressStorageAdapter = AsyncStorage): DailyProgressStore {
	return new DailyProgressStore(storage);
}

export class DailyProgressStore {
	constructor(private readonly storage: ProgressStorageAdapter) {}

	async load(): Promise<ProgressResult<DailyProgressLoadState>> {
		let raw: string | null;
		try {
			raw = await this.storage.getItem(DAILY_PROGRESS_KEY);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'readFailed', message: 'Unable to read Daily Challenge progress.' } };
			throw error;
		}
		if (raw === null) return { ok: true, value: { kind: 'ready', progress: emptyDailyProgress } };
		try {
			const progress = parseProgressJson(raw);
			if (progress !== null) return { ok: true, value: { kind: 'ready', progress } };
		} catch (error) {
			if (!(error instanceof SyntaxError)) throw error;
		}
		try {
			await this.storage.setItem(DAILY_PROGRESS_QUARANTINE_KEY, raw);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } };
			throw error;
		}
		return { ok: true, value: { kind: 'quarantined', message: 'Daily Challenge progress needs recovery.' } };
	}

	async commit(progress: DailyProgress): Promise<ProgressResult<DailyProgress>> {
		const serialized = serializeProgress(progress);
		try {
			await this.storage.setItem(DAILY_PROGRESS_KEY, serialized);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } };
			throw error;
		}
		let raw: string | null;
		try {
			raw = await this.storage.getItem(DAILY_PROGRESS_KEY);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'readFailed', message: 'Unable to read Daily Challenge progress.' } };
			throw error;
		}
		const verified = raw === null ? null : progressOrEmpty(raw);
		if (raw !== serialized || verified === null) {
			return { ok: false, error: { kind: 'verificationFailed', message: 'Daily Challenge progress write verification failed.' } };
		}
		return { ok: true, value: progress };
	}
}

export class DailyProgressMutationQueue {
	private tail: Promise<void> = Promise.resolve();

	constructor(private readonly store = createDailyProgressStore()) {}

	recordPuzzleTerminal(input: PuzzleTerminalMutation): Promise<ProgressResult<DailyProgress>> {
		return this.enqueue((progress) => applyTerminal(progress, input));
	}

	savePuzzleProgress(input: PuzzleProgressMutation): Promise<ProgressResult<DailyProgress>> {
		return this.enqueue((progress) => applyPuzzleProgress(progress, input));
	}

	recordThemeQuizResult(input: ThemeQuizMutation): Promise<ProgressResult<DailyProgress>> {
		return this.enqueue((progress) => applyThemeQuiz(progress, input));
	}

	private async enqueue(apply: (progress: DailyProgress) => DailyProgress): Promise<ProgressResult<DailyProgress>> {
		const run = this.tail.then(async () => {
			const loaded = await this.store.load();
			if (!loaded.ok) return loaded;
			if (loaded.value.kind === 'quarantined') {
				return { ok: false, error: { kind: 'corruptRecord', message: loaded.value.message } } satisfies ProgressResult<DailyProgress>;
			}
			return this.store.commit(apply(loaded.value.progress));
		});
		this.tail = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}
}

export async function loadDailyStatsSummary(store = createDailyProgressStore()): Promise<DailyStatsSummary> {
	const loaded = await store.load();
	if (!loaded.ok) throw new DailyStatsLoadError(loaded.error.kind, loaded.error.message);
	if (loaded.value.kind === 'quarantined') throw new DailyStatsLoadError('corruptRecord', loaded.value.message);
	return loaded.value.progress.statsSummary;
}

export async function loadDailyChallengeStatusSummary(
	challengeId: ChallengeId,
	store = createDailyProgressStore(),
): Promise<DailyChallengeStatusSummary> {
	const loaded = await store.load();
	if (!loaded.ok) throw new DailyStatsLoadError(loaded.error.kind, loaded.error.message);
	if (loaded.value.kind === 'quarantined') throw new DailyStatsLoadError('corruptRecord', loaded.value.message);
	const record = loaded.value.progress.challenges.find((candidate) => candidate.challengeId === challengeId);
	if (record === undefined) return { challengeId, status: 'new', terminalEvents: 0, totalPuzzles: CANONICAL_PUZZLE_KEYS.length };
	const terminalEvents = record.officialAttempt?.terminalEvents.length ?? 0;
	const status = hasAllOfficialTerminalEvents(record) ? 'completed' : terminalEvents > 0 || record.inProgressPuzzles.length > 0 || record.themeQuizResult !== undefined ? 'playing' : 'new';
	return { challengeId, status, terminalEvents, totalPuzzles: CANONICAL_PUZZLE_KEYS.length };
}

export async function loadDailyProgressArchiveState(store: DailyProgressStore, challengeId: ChallengeId): Promise<ArchiveState> {
	const loaded = await store.load();
	if (!loaded.ok || loaded.value.kind !== 'ready') return { kind: 'missed', challengeId };
	const record = loaded.value.progress.challenges.find((candidate) => candidate.challengeId === challengeId);
	if (record === undefined) return { kind: 'missed', challengeId };
	if (hasAllOfficialTerminalEvents(record)) return { kind: 'completed', challengeId };
	if (record.inProgressPuzzles.length > 0 || record.officialAttempt !== undefined || record.themeQuizResult !== undefined) return { kind: 'inProgress', challengeId };
	return record.replayAttempts.length > 0 ? { kind: 'replayOnly', challengeId, replayCount: record.replayAttempts.length } : { kind: 'missed', challengeId };
}

function applyTerminal(progress: DailyProgress, input: PuzzleTerminalMutation): DailyProgress {
	if (progress.mutationEventIds.includes(input.terminalEventId)) return progress;
	const record = findOrCreateRecord(progress, input.challengeId, input.source, input.migrationStatus ?? 'fresh', input.bundleSnapshot);
	const event = terminalEvent(input);
	const acceptsOfficialEvent = input.attemptKind === 'official' && record.officialAttempt?.terminalEvents.some((candidate) => candidate.puzzleKey === event.puzzleKey) !== true;
	const nextRecord = input.attemptKind === 'official' ? applyOfficialTerminal(record, event) : applyReplayTerminal(record, event);
	return finishMutation(progress, nextRecord, input.terminalEventId, acceptsOfficialEvent ? input.completedAt : null);
}

function applyOfficialTerminal(record: DailyChallengeProgressRecord, event: TerminalProgressEvent): DailyChallengeProgressRecord {
	const existing = record.officialAttempt;
	if (existing?.terminalEvents.some((candidate) => candidate.puzzleKey === event.puzzleKey) === true) return record;
	return { ...record, officialAttempt: { attemptId: existing?.attemptId ?? event.attemptId, terminalEvents: [...(existing?.terminalEvents ?? []), event] } };
}

function applyReplayTerminal(record: DailyChallengeProgressRecord, event: TerminalProgressEvent): DailyChallengeProgressRecord {
	const attempts = record.replayAttempts.filter((attempt) => attempt.attemptId !== event.attemptId);
	const existing = record.replayAttempts.find((attempt) => attempt.attemptId === event.attemptId);
	const nextAttempt: ReplayProgressAttempt = { attemptId: event.attemptId, terminalEvents: [...(existing?.terminalEvents ?? []), event] };
	return { ...record, replayAttempts: [...attempts, nextAttempt] };
}

function applyPuzzleProgress(progress: DailyProgress, input: PuzzleProgressMutation): DailyProgress {
	const eventId = `progress:${input.challengeId}:${input.puzzleKey}:${(input.updatedAt ?? new Date()).toISOString()}`;
	const record = findOrCreateRecord(progress, input.challengeId, input.source, 'fresh', input.bundleSnapshot);
	const rest = record.inProgressPuzzles.filter((snapshot) => snapshot.puzzleKey !== input.puzzleKey);
	const nextRecord: DailyChallengeProgressRecord = {
		...record,
		inProgressPuzzles: [...rest, { puzzleKey: input.puzzleKey, state: input.state, updatedAt: (input.updatedAt ?? new Date()).toISOString() }],
	};
	return finishMutation(progress, nextRecord, eventId, null);
}

function applyThemeQuiz(progress: DailyProgress, input: ThemeQuizMutation): DailyProgress {
	if (progress.mutationEventIds.includes(input.eventId)) return progress;
	const record = findOrCreateRecord(progress, input.challengeId, null);
	if (record.themeQuizResult !== undefined) return finishMutation(progress, record, input.eventId, null);
	const nextRecord = { ...record, themeQuizResult: { answerIndex: input.answerIndex, answeredAt: input.answeredAt.toISOString(), eventId: input.eventId } };
	return finishMutation(progress, nextRecord, input.eventId, null);
}

function finishMutation(progress: DailyProgress, record: DailyChallengeProgressRecord, eventId: string, completedAt: Date | null): DailyProgress {
	const challenges = [...progress.challenges.filter((candidate) => candidate.challengeId !== record.challengeId), record];
	const base = { schemaVersion: progress.schemaVersion, challenges, credits: progress.credits, mutationEventIds: [...progress.mutationEventIds, eventId] };
	const withCredit = completedAt !== null && hasAllOfficialTerminalEvents(record) ? applyCompletionCredit(base, record.challengeId, completedAt) : base;
	return makeProgressReady(withCredit);
}

function applyCompletionCredit(progress: Omit<DailyProgress, 'statsSummary'>, challengeId: ChallengeId, completedAt: Date): Omit<DailyProgress, 'statsSummary'> {
	const creditId = `credit:${challengeId}`;
	if (progress.credits.some((credit) => credit.creditId === creditId)) return progress;
	const eligibility = evaluateOfficialStreakEligibility({
		challengeId,
		startedAt: completedAt,
		completedAt,
		creditedChallengeIds: progress.credits.map((credit) => credit.challengeId),
		creditedStreakDates: progress.credits.map((credit) => credit.streakDate),
	});
	return eligibility.kind === 'credit'
		? { ...progress, credits: [...progress.credits, { challengeId, completedAt: completedAt.toISOString(), creditId, streakDate: eligibility.streakDate }] }
		: progress;
}

function findOrCreateRecord(
	progress: DailyProgress,
	challengeId: ChallengeId,
	source: ChallengeSource | null,
	migrationStatus: DailyChallengeProgressRecord['migrationStatus'] = 'fresh',
	bundleSnapshot?: DailyCatalogBundle,
): DailyChallengeProgressRecord {
	const existing = progress.challenges.find((record) => record.challengeId === challengeId);
	if (existing !== undefined) return bundleSnapshot === undefined || existing.bundleSnapshot !== undefined ? existing : { ...existing, bundleSnapshot };
	return {
			challengeId,
			source,
			bundleSnapshot,
			migrationStatus,
			inProgressPuzzles: [],
			replayAttempts: [],
		};
}

function terminalEvent(input: PuzzleTerminalMutation): TerminalProgressEvent {
	return {
		attemptId: input.attemptId,
		completedAt: input.completedAt.toISOString(),
		puzzleKey: input.puzzleKey,
		reason: input.reason,
		terminalEventId: input.terminalEventId,
	};
}

function serializeProgress(progress: DailyProgress): string {
	return JSON.stringify(makeProgressReady(progress));
}

export const dailyProgressMutationQueue = new DailyProgressMutationQueue();
