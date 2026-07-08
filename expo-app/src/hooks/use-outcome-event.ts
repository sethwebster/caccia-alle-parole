import { Observe } from 'expo-observe';
import { useEffect, useRef } from 'react';

type Attributes = Record<string, string | number | boolean>;

/**
 * Fires an Observe event exactly once each time `ended` goes false→true.
 * `build` is read through a ref so it can close over live game state without
 * retriggering the effect; it runs at the transition and captures the terminal
 * values (win/loss, score, category). The one-shot resets when `ended` returns
 * to false, so the next round reports again.
 */
export function useOutcomeEvent(ended: boolean, name: string, build: () => Attributes): void {
	const buildRef = useRef(build);
	// Sync in an effect (not during render) so the ref is fresh when the
	// firing effect below reads it. Declared first, so it commits first.
	useEffect(() => {
		buildRef.current = build;
	});

	const firedRef = useRef(false);
	useEffect(() => {
		if (!ended) {
			firedRef.current = false;
			return;
		}
		if (firedRef.current) return;
		firedRef.current = true;
		Observe.logEvent(name, { attributes: buildRef.current() });
	}, [ended, name]);
}
