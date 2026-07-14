/**
 * iOS implementation of the Paroliere Live Activity bridge (see
 * live-activity.ts for the shared types and the Android/web no-op).
 *
 * The countdown is a native auto-updating timer (see paroliere-activity.tsx),
 * driven by wall-clock bounds recomputed from `secondsLeft` on every call —
 * no per-second update() calls are needed to keep it ticking.
 */
import type { LiveActivity } from 'expo-widgets';

import { paroliereActivity, type ParoliereActivityProps } from '@/widgets/paroliere-activity';

import type { ParoliereActivityState } from './live-activity';

export type { ParoliereActivityState };

/** The activity for the current round; null when none is running. */
let current: LiveActivity<ParoliereActivityProps> | null = null;
/** Wall-clock start of the current round (countdown lower bound). */
let startedAt = 0;

function toProps(state: ParoliereActivityState): ParoliereActivityProps {
	return {
		startedAt,
		endsAt: Date.now() + Math.max(0, state.secondsLeft) * 1000,
		score: state.score,
		wordsFound: state.wordsFound,
	};
}

export function startParoliereActivity(state: ParoliereActivityState): void {
	startedAt = Date.now();
	try {
		// A previous round's activity may still be on the Lock Screen (it can
		// even survive an app restart); remove it before starting the new one.
		for (const stale of paroliereActivity.getInstances()) {
			void stale.end('immediate');
		}
		current = paroliereActivity.start(toProps(state), 'cacciaparole://paroliere');
	} catch (error) {
		// expo-widgets exposes no JS-side availability check; start() (and
		// getInstances()) throw when Live Activities are unsupported
		// (iOS < 16.2) or disabled by the user in Settings. That is an
		// expected environment state, not a hidden failure: warn and skip.
		console.warn('[live-activity] Live Activity non disponibile:', error);
		current = null;
	}
}

export function updateParoliereActivity(state: ParoliereActivityState): void {
	if (current === null) {
		return;
	}
	const activity = current;
	activity.update(toProps(state)).catch((error: unknown) => {
		// The activity is gone (e.g. dismissed by the user): stop updating it.
		console.warn('[live-activity] update non riuscito:', error);
		if (current === activity) {
			current = null;
		}
	});
}

export function endParoliereActivity(finalState: ParoliereActivityState): void {
	if (current === null) {
		return;
	}
	const activity = current;
	current = null;
	// Keep the final score visible on the Lock Screen for two minutes.
	activity
		.end({ after: new Date(Date.now() + 2 * 60 * 1000) }, toProps(finalState))
		.catch((error: unknown) => {
			console.warn('[live-activity] end non riuscito:', error);
		});
}
