import type { DailyCatalogBundle } from './catalog';
import { ACTIVE_ATTEMPT_STATE_KIND, type ActiveDailyAttempt, type DailyChallengePhase, type DailyChallengeReadySnapshot, type DailyPuzzleRuntime, type PersistedActiveAttemptState, type ThemeGateState } from './orchestrator-model';
import type { DailyChallengeProgressRecord, DailyProgress, PuzzleProgressSnapshot, TerminalProgressEvent } from './progress-model';
import type { ChallengeId, DailyPuzzleKey, TerminalAttemptContext } from './types';

type ActiveAttemptCandidate = ActiveDailyAttempt & { readonly order: number };

export function deriveDailyChallengeSnapshot(input: {
	readonly bundle: DailyCatalogBundle;
	readonly progress: DailyProgress;
	readonly mode: 'official' | 'replay';
	readonly activeReplayAttemptId?: string;
}): DailyChallengeReadySnapshot {
	const record = input.progress.challenges.find((candidate) => candidate.challengeId === input.bundle.challengeId);
	const activeAttempt = record === undefined ? undefined : activeAttemptFromRecord(record, input.mode, input.activeReplayAttemptId);
	const puzzles = input.bundle.puzzles.map((puzzle) => ({ key: puzzle.key, label: puzzle.label, status: puzzleStatus(record, puzzle.key, activeAttempt, input.mode, input.activeReplayAttemptId) }));
	const phase = challengePhase(record, activeAttempt);
	const currentPuzzleKey = firstPuzzleWithStatus(puzzles, 'inProgress') ?? firstPuzzleWithStatus(puzzles, 'notStarted');
	const nextPuzzleKey = firstPuzzleWithStatus(puzzles, 'notStarted');
	return {
		kind: 'ready',
		mode: input.mode,
		phase,
		themeGate: themeGateForPhase(phase),
		bundle: input.bundle,
		progress: input.progress,
		record,
		puzzles,
		currentPuzzleKey,
		nextPuzzleKey,
		activeAttempt,
	};
}

export function buildActiveAttemptState(context: TerminalAttemptContext, startedAt: Date): PersistedActiveAttemptState {
	return { kind: ACTIVE_ATTEMPT_STATE_KIND, context, startedAt: startedAt.toISOString() };
}

export function activeAttemptMatches(activeAttempt: ActiveDailyAttempt | undefined, context: TerminalAttemptContext | undefined): boolean {
	return activeAttempt !== undefined && context !== undefined && sameAttemptContext(activeAttempt.context, context);
}

export function sameAttemptContext(left: TerminalAttemptContext, right: TerminalAttemptContext): boolean {
	return left.challengeId === right.challengeId && left.puzzleKey === right.puzzleKey && left.attemptKind === right.attemptKind && left.attemptId === right.attemptId && left.terminalEventId === right.terminalEventId;
}

export function makeAttemptContext(input: {
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly attemptKind: 'official' | 'replay';
	readonly ordinal: number;
}): TerminalAttemptContext {
	const attemptId = `${input.challengeId}:${input.puzzleKey}:${input.attemptKind}:${input.ordinal}`;
	return {
		challengeId: input.challengeId,
		puzzleKey: input.puzzleKey,
		attemptKind: input.attemptKind,
		attemptId,
		terminalEventId: `terminal:${attemptId}`,
	};
}

function activeAttemptFromRecord(
	record: DailyChallengeProgressRecord,
	mode: 'official' | 'replay',
	activeReplayAttemptId: string | undefined,
): ActiveDailyAttempt | undefined {
	let selected: ActiveAttemptCandidate | undefined;
	for (const [order, snapshot] of record.inProgressPuzzles.entries()) {
		const candidate = parseActiveAttemptSnapshot(snapshot, order);
		if (candidate === null || candidate.context.attemptKind !== mode || !isAttemptStillOpen(record, candidate, activeReplayAttemptId)) continue;
		if (selected === undefined || candidate.startedAt.localeCompare(selected.startedAt) > 0 || (candidate.startedAt === selected.startedAt && candidate.order > selected.order)) {
			selected = candidate;
		}
	}
	return selected;
}

function parseActiveAttemptSnapshot(snapshot: PuzzleProgressSnapshot, order: number): ActiveAttemptCandidate | null {
	if (!isPersistedActiveAttemptState(snapshot.state)) return null;
	return { context: snapshot.state.context, startedAt: snapshot.state.startedAt, order };
}

function isPersistedActiveAttemptState(value: unknown): value is PersistedActiveAttemptState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Reflect.get(value, 'kind') === ACTIVE_ATTEMPT_STATE_KIND && typeof Reflect.get(value, 'startedAt') === 'string' && isTerminalAttemptContext(Reflect.get(value, 'context'));
}

function isTerminalAttemptContext(value: unknown): value is TerminalAttemptContext {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const attemptKind = Reflect.get(value, 'attemptKind');
	return typeof Reflect.get(value, 'challengeId') === 'string' && isDailyPuzzleKey(Reflect.get(value, 'puzzleKey')) && (attemptKind === 'official' || attemptKind === 'replay') && typeof Reflect.get(value, 'attemptId') === 'string' && typeof Reflect.get(value, 'terminalEventId') === 'string';
}

function isDailyPuzzleKey(value: unknown): value is DailyPuzzleKey {
	switch (value) {
		case 'parola':
		case 'caccia':
		case 'paroliere':
		case 'impiccato':
		case 'anagrammi':
			return true;
		default:
			return false;
	}
}

function isAttemptStillOpen(record: DailyChallengeProgressRecord, attempt: ActiveDailyAttempt, activeReplayAttemptId: string | undefined): boolean {
	if (attempt.context.attemptKind === 'official') return officialTerminalForPuzzle(record, attempt.context.puzzleKey) === undefined;
	return activeReplayAttemptId === attempt.context.attemptId && replayTerminalForAttempt(record, attempt.context.attemptId, attempt.context.puzzleKey) === undefined;
}

function puzzleStatus(record: DailyChallengeProgressRecord | undefined, puzzleKey: DailyPuzzleKey, activeAttempt: ActiveDailyAttempt | undefined, mode: 'official' | 'replay', activeReplayAttemptId: string | undefined): DailyPuzzleRuntime['status'] {
	const terminal = mode === 'official' || record === undefined || activeReplayAttemptId === undefined ? record === undefined ? undefined : officialTerminalForPuzzle(record, puzzleKey) : replayTerminalForAttempt(record, activeReplayAttemptId, puzzleKey);
	if (record !== undefined && terminal !== undefined) return { kind: 'terminal', reason: terminal.reason, context: terminalContext(record, terminal, mode) };
	if (activeAttempt?.context.puzzleKey === puzzleKey && activeAttempt.context.attemptKind === mode) return { kind: 'inProgress', context: activeAttempt.context };
	return { kind: 'notStarted' };
}

function officialTerminalForPuzzle(record: DailyChallengeProgressRecord, puzzleKey: DailyPuzzleKey): TerminalProgressEvent | undefined {
	return record.officialAttempt?.terminalEvents.find((event) => event.puzzleKey === puzzleKey);
}

function replayTerminalForAttempt(record: DailyChallengeProgressRecord, attemptId: string, puzzleKey: DailyPuzzleKey): TerminalProgressEvent | undefined {
	return record.replayAttempts.find((attempt) => attempt.attemptId === attemptId)?.terminalEvents.find((event) => event.puzzleKey === puzzleKey);
}

function terminalContext(record: DailyChallengeProgressRecord, event: TerminalProgressEvent, attemptKind: 'official' | 'replay'): TerminalAttemptContext {
	return { challengeId: record.challengeId, puzzleKey: event.puzzleKey, attemptKind, attemptId: event.attemptId, terminalEventId: event.terminalEventId };
}

function challengePhase(record: DailyChallengeProgressRecord | undefined, activeAttempt: ActiveDailyAttempt | undefined): DailyChallengePhase {
	if ((record?.officialAttempt?.terminalEvents.length ?? 0) === 5) return 'completedOfficial';
	return record !== undefined || activeAttempt !== undefined ? 'inProgress' : 'notStarted';
}

function themeGateForPhase(phase: DailyChallengePhase): ThemeGateState {
	switch (phase) {
		case 'completedOfficial':
			return 'unlocked';
		case 'notStarted':
		case 'inProgress':
			return 'locked';
	}
}

function firstPuzzleWithStatus(puzzles: readonly DailyPuzzleRuntime[], status: DailyPuzzleRuntime['status']['kind']): DailyPuzzleKey | undefined {
	return puzzles.find((puzzle) => puzzle.status.kind === status)?.key;
}
