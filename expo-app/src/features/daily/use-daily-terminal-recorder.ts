import { useEffect, useRef, useState } from 'react';

import type { TerminalRecordResult } from './orchestrator-model';
import type { DailyGameChallengeRoute } from './use-daily-game-route-mode';
import type { TerminalReason } from './types';

export class DailyTerminalRecordError extends Error {
	readonly name = 'DailyTerminalRecordError';

	constructor(readonly result: Extract<TerminalRecordResult, { readonly kind: 'rejected' }>) {
		super(`Daily Challenge terminal write rejected: ${result.reason}`);
	}
}

export function useDailyTerminalRecorder(challenge: DailyGameChallengeRoute | undefined, reason: TerminalReason | undefined): void {
	const recordedRef = useRef<string | undefined>(undefined);
	const [recordError, setRecordError] = useState<DailyTerminalRecordError>();
	if (recordError !== undefined) throw recordError;

	useEffect(() => {
		if (challenge === undefined || reason === undefined) return;
		const recordKey = `${challenge.context.terminalEventId}:${reason}`;
		if (recordedRef.current === recordKey) return;
		recordedRef.current = recordKey;
		challenge.recordTerminal(reason).then((result) => {
			if (result.kind === 'rejected') setRecordError(new DailyTerminalRecordError(result));
		});
	}, [challenge, reason]);
}
