import { ACTIVE_ATTEMPT_STATE_KIND, type DailyChallengeReadySnapshot } from './orchestrator-model';
import { activeAttemptMatches } from './orchestrator-machine';
import type { TerminalAttemptContext } from './types';

/**
 * Keep the attempt clock available after its terminal write. The orchestrator
 * intentionally clears `activeAttempt` at that point, but the persisted start
 * snapshot remains in the record. Dropping the timestamp here changed the
 * route-session identity and re-hydrated several games before their delayed
 * result modal could appear.
 */
export function attemptStartedAtForRoute(
	snapshot: DailyChallengeReadySnapshot | undefined,
	context: TerminalAttemptContext | undefined,
): string | undefined {
	if (snapshot === undefined || context === undefined) return undefined;
	const activeAttempt = snapshot.activeAttempt;
	if (activeAttempt !== undefined && activeAttemptMatches(activeAttempt, context)) return activeAttempt.startedAt;
	for (const puzzle of snapshot.record?.inProgressPuzzles ?? []) {
		if (puzzle.puzzleKey !== context.puzzleKey || typeof puzzle.state !== 'object' || puzzle.state === null) continue;
		if (Reflect.get(puzzle.state, 'kind') !== ACTIVE_ATTEMPT_STATE_KIND) continue;
		const startedAt = Reflect.get(puzzle.state, 'startedAt');
		const persistedContext = Reflect.get(puzzle.state, 'context');
		if (typeof startedAt !== 'string' || typeof persistedContext !== 'object' || persistedContext === null) continue;
		if (activeAttemptMatches({ context: persistedContext as TerminalAttemptContext, startedAt }, context)) return startedAt;
	}
	return undefined;
}
