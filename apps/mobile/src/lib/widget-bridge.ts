/**
 * Bridge between game state and the iOS home-screen widget.
 * Games only call these functions.
 *
 * This file is the Android/web no-op. The real implementation lives in
 * widget-bridge.ios.ts (Metro platform resolution), which keeps expo-widgets
 * and the widget files out of non-iOS bundles entirely.
 */

export type ParolaWidgetState = {
	/** 'playing' | 'won' | 'lost' for today's puzzle */
	gameState: string;
	guessCount: number;
	puzzleNumber: number;
	streak: number;
};

export function updateParolaWidget(_state: ParolaWidgetState): void {
	// iOS-only feature — see widget-bridge.ios.ts.
}
