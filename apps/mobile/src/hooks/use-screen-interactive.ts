import { useObserve } from 'expo-observe';
import { useEffect } from 'react';

/**
 * Reports TTI to EAS Observe once `ready` turns true. With the expo-router
 * integration enabled, calling it inside a screen scopes the metric to that
 * route; repeated calls are no-ops, so every entry screen (deep-link targets
 * included) can call it safely.
 */
export function useScreenInteractive(ready = true): void {
	const { markInteractive } = useObserve();
	useEffect(() => {
		if (ready) markInteractive();
	}, [ready, markInteractive]);
}
