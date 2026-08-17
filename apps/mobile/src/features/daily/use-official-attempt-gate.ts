import * as Updates from 'expo-updates';
import { useCallback, useRef } from 'react';

import { UPDATES_ENABLED } from '@/features/updates/updates-runtime';

import { selectOfficialAttemptGate, type OfficialAttemptGate } from './official-attempt-gate';

export type OfficialAttemptGateController = {
	readonly gate: OfficialAttemptGate;
	/** Applies the update the gate is waiting on. No-op while one is already in flight. */
	readonly resolve: () => void;
};

/** Reads live update state so official daily play can require the current build. */
export function useOfficialAttemptGate(mode: 'official' | 'replay'): OfficialAttemptGateController {
	const { isUpdateAvailable, isUpdatePending, isDownloading, isRestarting } = Updates.useUpdates();
	const busy = useRef(false);

	const gate = selectOfficialAttemptGate({ enabled: UPDATES_ENABLED, mode, isUpdateAvailable, isUpdatePending, isDownloading, isRestarting });

	const resolve = useCallback(() => {
		if (busy.current || gate.kind !== 'blocked' || gate.action === 'none') return;
		busy.current = true;
		const run = gate.action === 'restart' ? Updates.reloadAsync() : Updates.fetchUpdateAsync().then(() => Updates.reloadAsync());
		void run.finally(() => {
			busy.current = false;
		});
	}, [gate]);

	return { gate, resolve };
}
