import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { InvalidLocalCivilDateError, makeChallengeId } from './date';
import { buildDailyRouteModel, type DailyRouteModel, type DailyRoutePuzzleModel } from './daily-route-model';
import { DailyRouteLaunchError, launchDailyRoutePuzzle } from './daily-route-launch';
import { dailyLoadErrorModel, dailyRouteLaunchErrorModel, invalidDailyRouteState, loadingDailyState } from './daily-state-copy';
import type { ActiveDailyAttempt, TerminalRecordResult, ThemeAnswerRecordResult } from './orchestrator-model';
import type { ChallengeId } from './types';
import { useDailyChallenge } from './use-daily-challenge';
import { useDailyShare } from './use-daily-share';
import { startPuzzleForMode } from './daily-route-start';
import { useOfficialAttemptGate } from './use-official-attempt-gate';
import type { OfficialAttemptGate } from './official-attempt-gate';

type RouteChallengeParam =
	| { readonly kind: 'valid'; readonly challengeId?: ChallengeId }
	| { readonly kind: 'invalid' };

type DailyRouteActions = {
	readonly launchCurrent: () => void;
	readonly launchPuzzle: (puzzle: DailyRoutePuzzleModel) => void;
	readonly giveUpActive: () => void;
	readonly shareResult: () => void;
	readonly answerTheme: (answerIndex: number) => void;
	/** Applies the update an official attempt is waiting on. */
	readonly resolveOfficialGate: () => void;
};

export function useDailyRouteController(): { readonly model: DailyRouteModel; readonly officialGate: OfficialAttemptGate; readonly actions: DailyRouteActions } {
	const router = useRouter();
	const [actionError, setActionError] = useState<DailyRouteActionError>();
	const [launchError, setLaunchError] = useState<DailyRouteLaunchError>();
	if (actionError !== undefined) throw actionError;
	const params = useLocalSearchParams<{ challengeId?: string; mode?: string }>();
	const routeChallenge = parseRouteChallengeId(params.challengeId);
	const mode = params.mode === 'replay' && routeChallenge.kind === 'valid' && routeChallenge.challengeId !== undefined ? 'replay' : 'official';
	const daily = useDailyChallenge({ challengeId: routeChallenge.kind === 'valid' ? routeChallenge.challengeId : undefined, mode, enabled: routeChallenge.kind === 'valid' });
	const shareDailyResult = useDailyShare();
	// Everyone must play today's official attempt under the same dictionary, so a
	// pending build blocks the start rather than silently changing which words score.
	const { gate: officialGate, resolve: resolveOfficialGate } = useOfficialAttemptGate(mode);
	const baseModel: DailyRouteModel = routeChallenge.kind === 'invalid' ? { kind: 'error', ...invalidDailyRouteState() } : daily.loaded ? buildDailyRouteModel(daily.snapshot) : { kind: 'loading', ...loadingDailyState() };
	const model: DailyRouteModel = dailyRouteLaunchErrorModel(routeChallenge.kind === 'valid' ? dailyLoadErrorModel(baseModel, daily.loadError) : baseModel, launchError);

	return {
		model,
		officialGate,
		actions: {
			launchCurrent: () => {
				if (model.kind !== 'ready' || model.currentPuzzleHref === undefined || officialGate.kind === 'blocked') return;
				const href = model.currentPuzzleHref;
				void launchDailyRoutePuzzle({
					href,
					start: () => model.activePuzzleKey === undefined ? startPuzzleForMode(daily.orchestrator, model) : Promise.resolve(activeAttemptFor(daily.snapshot)),
					push: router.push,
					onError: setLaunchError,
				});
			},
			launchPuzzle: (puzzle) => {
				if (model.kind !== 'ready' || !puzzle.canLaunch || officialGate.kind === 'blocked') return;
				void launchDailyRoutePuzzle({
					href: puzzle.href,
					start: () => model.activePuzzleKey === undefined || model.activePuzzleKey !== puzzle.key ? startPuzzleForMode(daily.orchestrator, model, puzzle) : Promise.resolve(activeAttemptFor(daily.snapshot)),
					push: router.push,
					onError: setLaunchError,
				});
			},
			giveUpActive: () => {
				void daily.orchestrator.giveUpActive().then((result) => handleTerminalResult(result, setActionError));
			},
			shareResult: () => {
				if (model.kind !== 'ready') return;
				void shareDailyResult(model);
			},
			answerTheme: (answerIndex) => {
				if (model.kind !== 'ready') return;
				void daily.orchestrator.recordThemeAnswer({ answerIndex }).then((result) => handleThemeResult(result, setActionError));
			},
			resolveOfficialGate,
		},
	};
}

class DailyRouteActionError extends Error {
	readonly name = 'DailyRouteActionError';

	constructor(readonly action: 'terminal' | 'theme', readonly reason: string) {
		super(`Daily Challenge ${action} write rejected: ${reason}`);
	}
}

function handleTerminalResult(result: TerminalRecordResult, setActionError: (error: DailyRouteActionError) => void): void {
	if (result.kind === 'rejected') setActionError(new DailyRouteActionError('terminal', result.reason));
}

function handleThemeResult(result: ThemeAnswerRecordResult, setActionError: (error: DailyRouteActionError) => void): void {
	if (result.kind === 'rejected') setActionError(new DailyRouteActionError('theme', result.reason));
}

function activeAttemptFor(snapshot: ReturnType<typeof useDailyChallenge>['snapshot']): ActiveDailyAttempt {
	if (snapshot.kind !== 'ready' || snapshot.activeAttempt === undefined) throw new DailyRouteLaunchError(new Error('Daily challenge launch requires an active attempt.'));
	return snapshot.activeAttempt;
}

function parseRouteChallengeId(value: string | readonly string[] | undefined): RouteChallengeParam {
	const first = typeof value === 'string' ? value : value?.[0];
	if (first === undefined) return { kind: 'valid' };
	try {
		return { kind: 'valid', challengeId: makeChallengeId(first) };
	} catch (error) {
		if (error instanceof InvalidLocalCivilDateError) return { kind: 'invalid' };
		throw error;
	}
}
