import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { ChallengeId } from './types';
import { getDailyChallengeOrchestrator } from './orchestrator-service';

export function useDailyChallenge(input: { readonly challengeId?: ChallengeId; readonly mode?: 'official' | 'replay'; readonly now?: Date; readonly enabled?: boolean } = {}) {
	const [orchestrator] = useState(getDailyChallengeOrchestrator);
	const [loadedKey, setLoadedKey] = useState<string>();
	const loadSequence = useRef(0);
	const { challengeId, mode, now, enabled = true } = input;
	const loadKey = `${enabled ? 'enabled' : 'disabled'}:${mode ?? 'official'}:${challengeId ?? 'today'}:${now?.getTime() ?? 'current'}`;
	useEffect(() => {
		const sequence = loadSequence.current + 1;
		loadSequence.current = sequence;
		if (!enabled) return;
		const load = mode === 'replay' && challengeId !== undefined ? orchestrator.loadReplay({ challengeId, now }) : orchestrator.loadOfficial({ challengeId, now });
		void load.then(() => {
			if (loadSequence.current === sequence) setLoadedKey(loadKey);
		});
	}, [orchestrator, challengeId, enabled, loadKey, mode, now]);
	const snapshot = useSyncExternalStore(orchestrator.subscribe, orchestrator.getSnapshot, orchestrator.getSnapshot);
	const loaded = loadedKey === loadKey;
	return { snapshot, orchestrator, loaded };
}
