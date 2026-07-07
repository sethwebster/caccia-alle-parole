/**
 * Bridge between the Paroliere countdown and an iOS Live Activity.
 * The game only calls these functions.
 *
 * This file is the Android/web no-op. The real implementation lives in
 * live-activity.ios.ts (Metro platform resolution), which keeps expo-widgets
 * and the widget files out of non-iOS bundles entirely.
 */

export type ParoliereActivityState = {
	secondsLeft: number;
	score: number;
	wordsFound: number;
};

export function startParoliereActivity(_state: ParoliereActivityState): void {
	// iOS-only feature — see live-activity.ios.ts.
}

export function updateParoliereActivity(_state: ParoliereActivityState): void {
	// iOS-only feature — see live-activity.ios.ts.
}

export function endParoliereActivity(_finalState: ParoliereActivityState): void {
	// iOS-only feature — see live-activity.ios.ts.
}
