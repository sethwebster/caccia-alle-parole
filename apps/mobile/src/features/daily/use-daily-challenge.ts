import { useEffect, useState, useSyncExternalStore } from 'react';

import type { ChallengeId } from './types';
import { createDailyLoadStateTracker, type DailyLoadError } from './daily-load-state';
import { maybeDailyEntitlementReader } from './entitlement-reader';
import { getDailyChallengeOrchestrator } from './orchestrator-service';

export function useDailyChallenge(input: { readonly challengeId?: ChallengeId; readonly mode?: 'official' | 'replay'; readonly now?: Date; readonly enabled?: boolean } = {}) {
	const [orchestrator] = useState(getDailyChallengeOrchestrator);
	const [loadState] = useState(createDailyLoadStateTracker);
	const [loadedKey, setLoadedKey] = useState<string>();
	const [loadErrorState, setLoadErrorState] = useState<{ readonly loadKey: string; readonly error: DailyLoadError }>();
	const [entitlementEpoch, setEntitlementEpoch] = useState(0);
	useEffect(() => maybeDailyEntitlementReader()?.subscribeEntitlementChanged?.(() => setEntitlementEpoch((epoch) => epoch + 1)), []);
	const { challengeId, mode, now, enabled = true } = input;
	const loadKey = `${enabled ? 'enabled' : 'disabled'}:${mode ?? 'official'}:${challengeId ?? 'today'}:${now?.getTime() ?? 'current'}:${entitlementEpoch}`;
	useEffect(() => {
		const sequence = loadState.begin();
		if (!enabled) return;
		const load = mode === 'replay' && challengeId !== undefined ? orchestrator.loadReplay({ challengeId, now }) : orchestrator.loadOfficial({ challengeId, now });
		void load.then(
			() => {
				const outcome = loadState.resolve(sequence);
				if (outcome.kind !== 'current' || outcome.status !== 'resolved') return;
				setLoadedKey(loadKey);
				setLoadErrorState(undefined);
			},
			(error) => {
				const outcome = loadState.reject(sequence, error);
				if (outcome.kind !== 'current' || outcome.status !== 'rejected') return;
				setLoadedKey(undefined);
				setLoadErrorState({ loadKey, error: outcome.loadError });
			},
		);
	}, [orchestrator, challengeId, enabled, loadKey, loadState, mode, now]);
	const snapshot = useSyncExternalStore(orchestrator.subscribe, orchestrator.getSnapshot, orchestrator.getSnapshot);
	const loaded = loadedKey === loadKey;
	const loadError = loadErrorState?.loadKey === loadKey ? loadErrorState.error : undefined;
	return { snapshot, orchestrator, loaded, loadError };
}
