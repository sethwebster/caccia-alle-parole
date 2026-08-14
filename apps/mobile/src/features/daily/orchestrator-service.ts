import { CATALOG_METADATA, resolveDailyChallengeBundle } from './catalog';
import { challengeIdForDate } from './date';
import { requireDailyEntitlementReader, type DailyEntitlementReader } from './entitlement-reader';
import { activeAttemptMatches, buildActiveAttemptState, deriveDailyChallengeSnapshot, makeAttemptContext, sameAttemptContext } from './orchestrator-machine';
import type { ActiveDailyAttempt, DailyChallengeReadySnapshot, DailyChallengeSnapshot, StartAttemptInput, TerminalRecordResult, ThemeAnswerRecordResult } from './orchestrator-model';
import { createDailyProgressStore, dailyProgressMutationQueue, type DailyProgressMutationQueue, type DailyProgressStore } from './progress';
import type { DailyProgress } from './progress-model';
import type { ChallengeId, TerminalAttemptContext, TerminalReason } from './types';
import { logDailyChallengeCompleted, logDailyChallengeStarted, logDailyPuzzleEnded, logDailyThemeAnswered } from './daily-observe';

type OrchestratorServices = {
	readonly store?: DailyProgressStore;
	readonly queue?: DailyProgressMutationQueue;
	readonly entitlements?: DailyEntitlementReader;
};

type LoadOfficialInput = {
	readonly challengeId?: ChallengeId;
	readonly now?: Date;
};

type LoadReplayInput = {
	readonly challengeId: ChallengeId;
	readonly now?: Date;
	readonly activeReplayAttemptId?: string;
};

type RecordTerminalInput = {
	readonly context: TerminalAttemptContext | undefined;
	readonly reason: TerminalReason;
	readonly completedAt: Date;
};

type StartCurrentInput = {
	readonly now?: Date;
};

type GiveUpActiveInput = {
	readonly completedAt?: Date;
};

type RecordThemeAnswerInput = {
	readonly answerIndex: number;
	readonly answeredAt?: Date;
	readonly eventId?: string;
};

const initialSnapshot: DailyChallengeSnapshot = {
	kind: 'updateRequired',
	challengeId: challengeIdForDate(new Date()),
	reason: 'outsideSupportedRange',
	metadata: resolveDailyChallengeBundle({ today: new Date('2026-01-26T12:00:00') }).metadata,
};

export class DailyChallengeOrchestrator {
	private readonly store: DailyProgressStore;
	private readonly queue: DailyProgressMutationQueue;
	private readonly entitlements: DailyEntitlementReader | undefined;
	private snapshot: DailyChallengeSnapshot = initialSnapshot;
	private activeReplayAttemptId: string | undefined;
	private loadGeneration = 0;
	private readonly listeners = new Set<() => void>();

	constructor(services: OrchestratorServices = {}) {
		this.store = services.store ?? createDailyProgressStore();
		this.queue = services.queue ?? dailyProgressMutationQueue;
		this.entitlements = services.entitlements;
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getSnapshot = (): DailyChallengeSnapshot => this.snapshot;

	async loadOfficial(input: LoadOfficialInput = {}): Promise<DailyChallengeSnapshot> {
		const generation = this.beginLoad();
		const resolution = resolveDailyChallengeBundle({ challengeId: input.challengeId, today: input.now });
		const [entitled, progress] = await Promise.all([this.currentEntitlement(), this.loadProgress()]);
		if (!this.isCurrentLoad(generation)) return this.snapshot;
		if (!entitled) return this.setSnapshot({ kind: 'subscriptionRequired', challengeId: input.challengeId ?? challengeIdForDate(input.now ?? new Date()) });
		this.activeReplayAttemptId = undefined;
		if (!progress.ok) return this.setSnapshot({ kind: 'progressError', error: progress.error });
		if (resolution.kind === 'updateRequired') {
			const archived = archivedSnapshotFor(progress.value, resolution.challengeId);
			return archived === undefined ? this.setSnapshot(resolution) : this.setSnapshot(deriveDailyChallengeSnapshot({ bundle: archived, progress: progress.value, mode: 'official' }));
		}
		const bundle = liveArchivedSnapshotFor(progress.value, resolution.bundle.challengeId) ?? resolution.bundle;
		return this.setSnapshot(deriveDailyChallengeSnapshot({ bundle, progress: progress.value, mode: 'official' }));
	}

	async loadReplay(input: LoadReplayInput): Promise<DailyChallengeSnapshot> {
		const generation = this.beginLoad();
		const resolution = resolveDailyChallengeBundle({ challengeId: input.challengeId, today: input.now });
		const [entitled, progress] = await Promise.all([this.currentEntitlement(), this.loadProgress()]);
		if (!this.isCurrentLoad(generation)) return this.snapshot;
		if (!entitled) return this.setSnapshot({ kind: 'subscriptionRequired', challengeId: input.challengeId });
		if (!progress.ok) return this.setSnapshot({ kind: 'progressError', error: progress.error });
		const bundle = archivedSnapshotFor(progress.value, input.challengeId) ?? (resolution.kind === 'ready' ? resolution.bundle : undefined);
		if (bundle === undefined) return this.setSnapshot({ kind: 'updateRequired', challengeId: input.challengeId, reason: 'outsideSupportedRange', metadata: resolution.metadata });
		this.activeReplayAttemptId = input.activeReplayAttemptId;
		return this.setSnapshot(deriveDailyChallengeSnapshot({ bundle, progress: progress.value, mode: 'replay', activeReplayAttemptId: input.activeReplayAttemptId }));
	}

	async startPuzzle(input: StartAttemptInput): Promise<ActiveDailyAttempt> {
		this.invalidateLoads();
		const ready = this.requireReadyOfficial();
		const startedAt = input.now ?? new Date();
		const context = makeAttemptContext({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, attemptKind: 'official', ordinal: 1 });
		const activeAttempt = { context, startedAt: startedAt.toISOString() };
		const saved = await this.queue.savePuzzleProgress({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, state: buildActiveAttemptState(context, startedAt), source: ready.bundle.source, bundleSnapshot: ready.bundle, updatedAt: startedAt });
		if (!saved.ok) {
			this.setSnapshot({ kind: 'progressError', error: saved.error });
			throw new DailyChallengeOrchestratorStateError('progressError');
		}
		logDailyChallengeStarted({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, mode: 'official' });
		this.setSnapshot(deriveDailyChallengeSnapshot({ bundle: ready.bundle, progress: saved.value, mode: 'official' }));
		return activeAttempt;
	}

	async startCurrentPuzzle(input: StartCurrentInput = {}): Promise<ActiveDailyAttempt> {
		const ready = this.requireReadyOfficial();
		if (ready.currentPuzzleKey === undefined) throw new DailyChallengeOrchestratorStateError('currentPuzzleUnavailable');
		return this.startPuzzle({ puzzleKey: ready.currentPuzzleKey, now: input.now });
	}

	async startNextPuzzle(input: StartCurrentInput = {}): Promise<ActiveDailyAttempt> {
		const ready = this.requireReadyOfficial();
		if (ready.nextPuzzleKey === undefined) throw new DailyChallengeOrchestratorStateError('nextPuzzleUnavailable');
		return this.startPuzzle({ puzzleKey: ready.nextPuzzleKey, now: input.now });
	}

	async giveUpActive(input: GiveUpActiveInput = {}): Promise<TerminalRecordResult> {
		const ready = this.requireReady();
		return this.recordTerminal({ context: ready.activeAttempt?.context, reason: 'giveUp', completedAt: input.completedAt ?? new Date() });
	}

	async startReplay(input: StartAttemptInput): Promise<ActiveDailyAttempt> {
		this.invalidateLoads();
		const ready = this.requireReady();
		const startedAt = input.now ?? new Date();
		const ordinal = (ready.record?.replayAttempts.length ?? 0) + 1;
		const context = this.activeReplayAttemptId === undefined
			? makeAttemptContext({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, attemptKind: 'replay', ordinal })
			: makeReplayAttemptContext({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, attemptId: this.activeReplayAttemptId });
		this.activeReplayAttemptId = context.attemptId;
		const activeAttempt = { context, startedAt: startedAt.toISOString() };
		const saved = await this.queue.savePuzzleProgress({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, state: buildActiveAttemptState(context, startedAt), source: ready.bundle.source, bundleSnapshot: ready.bundle, updatedAt: startedAt });
		if (!saved.ok) {
			this.setSnapshot({ kind: 'progressError', error: saved.error });
			throw new DailyChallengeOrchestratorStateError('progressError');
		}
		logDailyChallengeStarted({ challengeId: ready.bundle.challengeId, puzzleKey: input.puzzleKey, mode: 'replay' });
		this.setSnapshot(deriveDailyChallengeSnapshot({ bundle: ready.bundle, progress: saved.value, mode: 'replay', activeReplayAttemptId: context.attemptId }));
		return activeAttempt;
	}

	async recordTerminal(input: RecordTerminalInput): Promise<TerminalRecordResult> {
		this.invalidateLoads();
		const ready = this.requireReady();
		if (ready.activeAttempt === undefined) return { kind: 'rejected', reason: 'attemptNotActive' };
		if (input.context === undefined) return { kind: 'rejected', reason: 'attemptMismatch' };
		if (!activeAttemptMatches(ready.activeAttempt, input.context)) return { kind: 'rejected', reason: 'attemptMismatch' };
		const recorded = await this.queue.recordPuzzleTerminal({ ...input.context, reason: input.reason, completedAt: input.completedAt, source: ready.bundle.source, bundleSnapshot: ready.bundle });
		if (!recorded.ok) {
			this.setSnapshot({ kind: 'progressError', error: recorded.error });
			return { kind: 'rejected', reason: 'progressError' };
		}
		const replayAttemptId = input.context.attemptKind === 'replay' ? input.context.attemptId : undefined;
		this.activeReplayAttemptId = replayAttemptId;
		const next = deriveDailyChallengeSnapshot({ bundle: ready.bundle, progress: recorded.value, mode: input.context.attemptKind, activeReplayAttemptId: replayAttemptId });
		const accepted = sameAttemptContext(ready.activeAttempt.context, input.context) && next.activeAttempt === undefined;
		const snapshot = this.setSnapshot(next);
		if (accepted) {
			logDailyPuzzleEnded({ challengeId: ready.bundle.challengeId, puzzleKey: input.context.puzzleKey, mode: input.context.attemptKind, reason: input.reason });
			if (ready.phase !== 'completedOfficial' && snapshot.phase === 'completedOfficial') {
				logDailyChallengeCompleted({ challengeId: ready.bundle.challengeId, wins: officialWinCount(snapshot), streak: snapshot.progress.statsSummary.currentStreak });
			}
		}
		return accepted ? { kind: 'accepted', snapshot } : { kind: 'rejected', reason: 'attemptNotActive' };
	}

	async recordThemeAnswer(input: RecordThemeAnswerInput): Promise<ThemeAnswerRecordResult> {
		this.invalidateLoads();
		const ready = this.requireReady();
		if (ready.mode !== 'official') return { kind: 'rejected', reason: 'replayMode' };
		if (ready.phase !== 'completedOfficial') return { kind: 'rejected', reason: 'notCompleted' };
		if (ready.record?.themeQuizResult !== undefined) return { kind: 'rejected', reason: 'alreadyAnswered' };
		if (!Number.isInteger(input.answerIndex) || input.answerIndex < 0 || input.answerIndex >= ready.bundle.theme.choices.length) {
			return { kind: 'rejected', reason: 'answerOutOfRange' };
		}
		const answeredAt = input.answeredAt ?? new Date();
		const recorded = await this.queue.recordThemeQuizResult({
			challengeId: ready.bundle.challengeId,
			eventId: input.eventId ?? `theme:${ready.bundle.challengeId}`,
			answerIndex: input.answerIndex,
			answeredAt,
		});
		if (!recorded.ok) {
			this.setSnapshot({ kind: 'progressError', error: recorded.error });
			return { kind: 'rejected', reason: 'progressError' };
		}
		const snapshot = this.setSnapshot(deriveDailyChallengeSnapshot({ bundle: ready.bundle, progress: recorded.value, mode: 'official' }));
		logDailyThemeAnswered({ challengeId: ready.bundle.challengeId, correct: input.answerIndex === ready.bundle.theme.answerIndex });
		return { kind: 'accepted', snapshot };
	}

	private currentEntitlement(): Promise<boolean> {
		return (this.entitlements ?? requireDailyEntitlementReader()).currentEntitlement();
	}

	private async loadProgress() {
		const loaded = await this.store.load();
		if (!loaded.ok) return loaded;
		if (loaded.value.kind === 'quarantined') return { ok: false, error: { kind: 'corruptRecord', message: loaded.value.message } } as const;
		return { ok: true, value: loaded.value.progress } as const;
	}

	private beginLoad(): number {
		this.loadGeneration += 1;
		return this.loadGeneration;
	}

	private invalidateLoads(): void {
		this.loadGeneration += 1;
	}

	private isCurrentLoad(generation: number): boolean {
		return generation === this.loadGeneration;
	}

	private requireReady(): DailyChallengeReadySnapshot {
		if (this.snapshot.kind !== 'ready') throw new DailyChallengeOrchestratorStateError(this.snapshot.kind);
		return this.snapshot;
	}

	private requireReadyOfficial(): DailyChallengeReadySnapshot {
		const ready = this.requireReady();
		if (ready.mode !== 'official') throw new DailyChallengeOrchestratorStateError(ready.mode);
		return ready;
	}

	private getReadySnapshot(): DailyChallengeReadySnapshot {
		return this.requireReady();
	}

	private setSnapshot<T extends DailyChallengeSnapshot>(snapshot: T): T {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener();
		return snapshot;
	}
}

function officialWinCount(snapshot: DailyChallengeReadySnapshot): number {
	return snapshot.puzzles.filter((puzzle) => puzzle.status.kind === 'terminal' && puzzle.status.reason === 'win').length;
}

function archivedSnapshotFor(progress: DailyProgress, challengeId: ChallengeId) {
	const record = progress.challenges.find((candidate) => candidate.challengeId === challengeId);
	return record?.bundleSnapshot;
}

/**
 * A day's puzzles are frozen the moment one is started, so a finished result can
 * never be re-scored against different content. Nothing is worth protecting
 * before the first terminal result though — challenge mode persists no in-game
 * state — so a snapshot left behind by a superseded catalog gives way to the
 * current one. Without this, a content fix never reaches a day the player had
 * already opened, and that day stays stale forever.
 */
function liveArchivedSnapshotFor(progress: DailyProgress, challengeId: ChallengeId) {
	const snapshot = archivedSnapshotFor(progress, challengeId);
	if (snapshot === undefined || snapshot.catalogVersion === CATALOG_METADATA.catalogVersion) return snapshot;
	return hasRecordedTerminal(progress, challengeId) ? snapshot : undefined;
}

function hasRecordedTerminal(progress: DailyProgress, challengeId: ChallengeId): boolean {
	const record = progress.challenges.find((candidate) => candidate.challengeId === challengeId);
	if (record === undefined) return false;
	return (record.officialAttempt?.terminalEvents.length ?? 0) > 0 || record.replayAttempts.some((attempt) => attempt.terminalEvents.length > 0);
}

function makeReplayAttemptContext(input: { readonly challengeId: ChallengeId; readonly puzzleKey: TerminalAttemptContext['puzzleKey']; readonly attemptId: string }): TerminalAttemptContext {
	return {
		challengeId: input.challengeId,
		puzzleKey: input.puzzleKey,
		attemptKind: 'replay',
		attemptId: input.attemptId,
		terminalEventId: `terminal:${input.attemptId}:${input.puzzleKey}`,
	};
}

export class DailyChallengeOrchestratorStateError extends Error {
	readonly name = 'DailyChallengeOrchestratorStateError';

	constructor(readonly state: string) {
		super(`Daily Challenge orchestrator is not ready: ${state}`);
	}
}

let dailyChallengeOrchestrator: DailyChallengeOrchestrator | undefined;

export function getDailyChallengeOrchestrator(): DailyChallengeOrchestrator {
	dailyChallengeOrchestrator ??= new DailyChallengeOrchestrator();
	return dailyChallengeOrchestrator;
}
