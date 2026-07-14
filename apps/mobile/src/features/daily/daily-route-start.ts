import type { DailyRoutePuzzleModel, DailyRouteReadyModel } from './daily-route-model';
import type { DailyChallengeOrchestrator } from './orchestrator-service';
import type { ActiveDailyAttempt } from './orchestrator-model';

export async function startPuzzleForMode(orchestrator: DailyChallengeOrchestrator, model: DailyRouteReadyModel, puzzle?: DailyRoutePuzzleModel): Promise<ActiveDailyAttempt> {
	const puzzleKey = puzzle?.key ?? model.activePuzzleKey ?? model.currentPuzzleKey;
	if (puzzleKey !== undefined) {
		return model.mode === 'replay' ? orchestrator.startReplay({ puzzleKey }) : orchestrator.startPuzzle({ puzzleKey });
	}
	return orchestrator.startCurrentPuzzle();
}
