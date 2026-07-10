import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { InvalidLocalCivilDateError, makeChallengeId } from './date';
import { buildDailyRouteModel, type DailyRouteModel, type DailyRoutePuzzleModel, type DailyRouteReadyModel } from './daily-route-model';
import { invalidDailyRouteState, loadingDailyState } from './daily-state-copy';
import type { ActiveDailyAttempt, TerminalRecordResult, ThemeAnswerRecordResult } from './orchestrator-model';
import type { DailyChallengeOrchestrator } from './orchestrator-service';
import { challengeStepHref } from './route-policy';
import type { ChallengeId } from './types';
import { useDailyChallenge } from './use-daily-challenge';
import { useDailyShare } from './use-daily-share';

type RouteChallengeParam =
	| { readonly kind: 'valid'; readonly challengeId?: ChallengeId }
	| { readonly kind: 'invalid' };

type DailyRouteActions = {
	readonly launchCurrent: () => void;
	readonly launchPuzzle: (puzzle: DailyRoutePuzzleModel) => void;
	readonly giveUpActive: () => void;
	readonly shareResult: () => void;
	readonly answerTheme: (answerIndex: number) => void;
};

export function useDailyRouteController(): { readonly model: DailyRouteModel; readonly actions: DailyRouteActions } {
	const router = useRouter();
	const [actionError, setActionError] = useState<DailyRouteActionError>();
	if (actionError !== undefined) throw actionError;
	const params = useLocalSearchParams<{ challengeId?: string; mode?: string }>();
	const routeChallenge = parseRouteChallengeId(params.challengeId);
	const mode = params.mode === 'replay' && routeChallenge.kind === 'valid' && routeChallenge.challengeId !== undefined ? 'replay' : 'official';
	const daily = useDailyChallenge({ challengeId: routeChallenge.kind === 'valid' ? routeChallenge.challengeId : undefined, mode, enabled: routeChallenge.kind === 'valid' });
	const shareDailyResult = useDailyShare();
	const model: DailyRouteModel = routeChallenge.kind === 'invalid' ? { kind: 'error', ...invalidDailyRouteState() } : daily.loaded ? buildDailyRouteModel(daily.snapshot) : { kind: 'loading', ...loadingDailyState() };

	return {
		model,
			actions: {
			launchCurrent: () => {
				if (model.kind !== 'ready' || model.currentPuzzleHref === undefined) return;
				const href = model.currentPuzzleHref;
				void (async () => {
					const attempt = model.activePuzzleKey === undefined ? await startPuzzleForMode(daily.orchestrator, model) : activeAttemptFor(daily.snapshot);
					router.push(challengeStepHref(href, attempt.context));
				})();
			},
			launchPuzzle: (puzzle) => {
				if (model.kind !== 'ready' || !puzzle.canLaunch) return;
				void (async () => {
					const attempt = model.activePuzzleKey === undefined || model.activePuzzleKey !== puzzle.key ? await startPuzzleForMode(daily.orchestrator, model, puzzle) : activeAttemptFor(daily.snapshot);
					router.push(challengeStepHref(puzzle.href, attempt.context));
				})();
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
	if (snapshot.kind !== 'ready' || snapshot.activeAttempt === undefined) throw new DailyRouteLaunchError();
	return snapshot.activeAttempt;
}

class DailyRouteLaunchError extends Error {
	readonly name = 'DailyRouteLaunchError';

	constructor() {
		super('Daily challenge launch requires an active attempt.');
	}
}

function startPuzzleForMode(orchestrator: DailyChallengeOrchestrator, model: DailyRouteReadyModel, puzzle?: DailyRoutePuzzleModel): Promise<ActiveDailyAttempt> {
	const puzzleKey = puzzle?.key ?? model.activePuzzleKey ?? model.currentPuzzleKey;
	if (puzzleKey !== undefined) return model.mode === 'replay' ? orchestrator.startReplay({ puzzleKey }) : orchestrator.startPuzzle({ puzzleKey });
	return orchestrator.startCurrentPuzzle();
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
