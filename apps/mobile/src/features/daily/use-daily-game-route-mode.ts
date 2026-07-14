import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { dailyPuzzleAdapters, type DailyAdapterInput } from './adapters';
import { makeChallengeId } from './date';
import type { DailyCatalogPuzzleSpec } from './catalog';
import type { TerminalRecordResult } from './orchestrator-model';
import { activeAttemptMatches } from './orchestrator-machine';
import { getDailyChallengeOrchestrator } from './orchestrator-service';
import { resolveGamePlayMode, type GamePlayMode } from './route-policy';
import type { DailyPuzzleKey, TerminalAttemptContext, TerminalReason } from './types';

export type DailyGameChallengeRoute = {
	readonly context: TerminalAttemptContext;
	readonly puzzle: DailyCatalogPuzzleSpec;
	recordTerminal(reason: TerminalReason): Promise<TerminalRecordResult>;
};

export type DailyGameRouteSession = {
	readonly playMode: GamePlayMode;
	readonly challenge?: DailyGameChallengeRoute;
	/** ISO start of the live attempt; undefined once the attempt is terminal. */
	readonly attemptStartedAt?: string;
};

export class DailyGameRouteSessionError extends Error {
	readonly name = 'DailyGameRouteSessionError';

	constructor(readonly field: string) {
		super(`Invalid Daily Challenge route ${field}`);
	}
}

export function useDailyGameRouteMode(puzzleKey: DailyPuzzleKey): DailyGameRouteSession {
	const params = useLocalSearchParams();
	const playMode = useMemo(() => resolveGamePlayMode({ mode: params.mode }), [params.mode]);
	const challengeId = params.challengeId;
	const attemptKind = params.attemptKind;
	const attemptId = params.attemptId;
	const terminalEventId = params.terminalEventId;
	const context = useMemo(
		() =>
			playMode.kind === 'challenge'
				? parseContext({ challengeId, attemptKind, attemptId, terminalEventId }, puzzleKey)
				: undefined,
		[attemptId, attemptKind, challengeId, playMode.kind, puzzleKey, terminalEventId],
	);
	const [orchestrator] = useState(getDailyChallengeOrchestrator);
	const snapshot = useSyncExternalStore(orchestrator.subscribe, orchestrator.getSnapshot, orchestrator.getSnapshot);
	const recordTerminal = useCallback(
		(reason: TerminalReason) => {
			if (context === undefined) throw new DailyGameRouteSessionError('context');
			return orchestrator.recordTerminal({ context, reason, completedAt: new Date() });
		},
		[context, orchestrator],
	);

	useEffect(() => {
		if (context === undefined) return;
		const load = context.attemptKind === 'replay' ? orchestrator.loadReplay({ challengeId: context.challengeId }) : orchestrator.loadOfficial({ challengeId: context.challengeId });
		void load;
	}, [context, orchestrator]);

	const routeSnapshot = context === undefined || snapshot.kind !== 'ready' || snapshot.bundle.challengeId !== context.challengeId || snapshot.mode !== context.attemptKind ? undefined : snapshot;
	// After this attempt records its terminal, the snapshot clears activeAttempt;
	// that render is legitimate (the game shows its result UI), not a route error.
	const puzzleRuntime = routeSnapshot?.puzzles.find((candidate) => candidate.key === puzzleKey);
	const attemptEnded = context !== undefined && puzzleRuntime?.status.kind === 'terminal' && puzzleRuntime.status.context.attemptId === context.attemptId;
	if (context !== undefined && routeSnapshot !== undefined && !attemptEnded && (routeSnapshot.activeAttempt === undefined || !activeAttemptMatches(routeSnapshot.activeAttempt, context))) {
		throw new DailyGameRouteSessionError('activeAttempt');
	}
	const puzzle = routeSnapshot?.bundle.puzzles.find((candidate) => candidate.key === puzzleKey);
	const attemptStartedAt =
		context !== undefined && routeSnapshot?.activeAttempt !== undefined && activeAttemptMatches(routeSnapshot.activeAttempt, context)
			? routeSnapshot.activeAttempt.startedAt
			: undefined;
	const session = useMemo<DailyGameRouteSession>(() => {
		if (context === undefined || puzzle === undefined) return { playMode };
		return { playMode, challenge: { context, puzzle, recordTerminal }, attemptStartedAt };
	}, [attemptStartedAt, context, playMode, puzzle, recordTerminal]);
	if (context !== undefined && routeSnapshot !== undefined && puzzle === undefined) throw new DailyGameRouteSessionError('puzzle');
	return session;
}

export function parseDailyAdapterSpec<Key extends DailyPuzzleKey>(challenge: DailyGameChallengeRoute, puzzleKey: Key): Extract<DailyAdapterInput, { readonly key: Key }> {
	switch (puzzleKey) {
		case 'parola':
			return dailyPuzzleAdapters.parola.parseSpec(challenge.puzzle) as Extract<DailyAdapterInput, { readonly key: Key }>;
		case 'caccia':
			return dailyPuzzleAdapters.caccia.parseSpec(challenge.puzzle) as Extract<DailyAdapterInput, { readonly key: Key }>;
		case 'paroliere':
			return dailyPuzzleAdapters.paroliere.parseSpec(challenge.puzzle) as Extract<DailyAdapterInput, { readonly key: Key }>;
		case 'impiccato':
			return dailyPuzzleAdapters.impiccato.parseSpec(challenge.puzzle) as Extract<DailyAdapterInput, { readonly key: Key }>;
		case 'anagrammi':
			return dailyPuzzleAdapters.anagrammi.parseSpec(challenge.puzzle) as Extract<DailyAdapterInput, { readonly key: Key }>;
	}
}

function parseContext(params: Record<string, string | readonly string[] | undefined>, puzzleKey: DailyPuzzleKey): TerminalAttemptContext {
	const challengeId = firstParam(params.challengeId);
	const attemptKind = firstParam(params.attemptKind);
	const attemptId = firstParam(params.attemptId);
	const terminalEventId = firstParam(params.terminalEventId);
	if (challengeId === undefined) throw new DailyGameRouteSessionError('challengeId');
	if (attemptKind !== 'official' && attemptKind !== 'replay') throw new DailyGameRouteSessionError('attemptKind');
	if (attemptId === undefined || attemptId.length === 0) throw new DailyGameRouteSessionError('attemptId');
	if (terminalEventId === undefined || terminalEventId.length === 0) throw new DailyGameRouteSessionError('terminalEventId');
	return { challengeId: makeChallengeId(challengeId), puzzleKey, attemptKind, attemptId, terminalEventId };
}

function firstParam(value: string | readonly string[] | undefined): string | undefined {
	return typeof value === 'string' ? value : value?.[0];
}
