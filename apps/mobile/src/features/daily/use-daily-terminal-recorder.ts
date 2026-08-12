import { useCallback, useEffect, useState } from 'react';

import type { TerminalRecordResult } from './orchestrator-model';
import type { DailyGameChallengeRoute } from './use-daily-game-route-mode';
import type { TerminalReason } from './types';

export class DailyTerminalRecordError extends Error {
	readonly name = 'DailyTerminalRecordError';

	constructor(readonly result: Extract<TerminalRecordResult, { readonly kind: 'rejected' }>) {
		super(`Daily Challenge terminal write rejected: ${result.reason}`);
	}
}

export class DailyTerminalRecordCoordinator {
	private activeRecord: { readonly eventId: string; readonly promise: Promise<void> } | undefined;
	private completion: Promise<void> | undefined;

	record(challenge: DailyGameChallengeRoute | undefined, reason: TerminalReason | undefined): Promise<void> {
		if (challenge === undefined || reason === undefined) return Promise.resolve();
		const eventId = challenge.context.terminalEventId;
		if (this.activeRecord?.eventId === eventId) return this.activeRecord.promise;
		const promise = challenge.recordTerminal(reason).then((result) => {
			if (result.kind === 'rejected') throw new DailyTerminalRecordError(result);
		});
		this.activeRecord = { eventId, promise };
		return promise;
	}

	complete(action: () => void): Promise<void> {
		this.completion ??= (async () => {
			await this.activeRecord?.promise;
			action();
		})();
		return this.completion;
	}
}

export type DailyTerminalCompletion = {
	readonly complete: (action: () => void) => Promise<void>;
};

export function useDailyTerminalRecorder(challenge: DailyGameChallengeRoute | undefined, reason: TerminalReason | undefined): DailyTerminalCompletion {
	const [coordinator] = useState(() => new DailyTerminalRecordCoordinator());
	const [recordError, setRecordError] = useState<Error>();
	if (recordError !== undefined) throw recordError;
	const reportRecordError = useCallback((error: unknown) => {
		setRecordError(error instanceof Error ? error : new Error('Daily Challenge terminal write failed.'));
	}, []);

	useEffect(() => {
		void coordinator.record(challenge, reason).catch(reportRecordError);
	}, [challenge, coordinator, reason, reportRecordError]);

	const complete = useCallback(
		async (action: () => void) => {
			try {
				// A result button can be tapped before the passive effect above runs.
				// Start the write synchronously from the tap, then leave only after it persists.
				await coordinator.record(challenge, reason);
				await coordinator.complete(action);
			} catch (error) {
				reportRecordError(error);
			}
		},
		[challenge, coordinator, reason, reportRecordError],
	);

	return { complete };
}
