import type { ActiveDailyAttempt } from './orchestrator-model';
import { challengeStepHref, type GameHref, type ChallengeStepRoute } from './route-policy';

type LaunchDailyRoutePuzzleInput = {
	readonly href: GameHref;
	readonly start: () => Promise<ActiveDailyAttempt>;
	readonly push: (route: ChallengeStepRoute) => void;
	readonly onError: (error: DailyRouteLaunchError) => void;
};

export class DailyRouteLaunchError extends Error {
	readonly name = 'DailyRouteLaunchError';

	constructor(readonly source: Error) {
		super(`Daily challenge launch failed: ${source.message}`);
	}
}

export async function launchDailyRoutePuzzle(input: LaunchDailyRoutePuzzleInput): Promise<void> {
	try {
		const attempt = await input.start();
		input.push(challengeStepHref(input.href, attempt.context));
	} catch (error) {
		if (error instanceof Error) {
			input.onError(new DailyRouteLaunchError(error));
			return;
		}
		throw error;
	}
}
