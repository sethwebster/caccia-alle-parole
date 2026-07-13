export class DailyLoadError extends Error {
	readonly name = 'DailyLoadError';

	constructor(readonly source: Error) {
		super(`Daily challenge load failed: ${source.message}`, { cause: source });
	}
}

export type DailyLoadStateOutcome =
	| { readonly kind: 'current'; readonly status: 'resolved' }
	| { readonly kind: 'current'; readonly status: 'rejected'; readonly loadError: DailyLoadError }
	| { readonly kind: 'stale' };

export class DailyLoadStateTracker {
	private sequence = 0;

	begin(): number {
		this.sequence += 1;
		return this.sequence;
	}

	resolve(sequence: number): DailyLoadStateOutcome {
		return sequence === this.sequence ? { kind: 'current', status: 'resolved' } : { kind: 'stale' };
	}

	reject(sequence: number, error: unknown): DailyLoadStateOutcome {
		return sequence === this.sequence ? { kind: 'current', status: 'rejected', loadError: new DailyLoadError(asDailyLoadSource(error)) } : { kind: 'stale' };
	}
}

export function createDailyLoadStateTracker(): DailyLoadStateTracker {
	return new DailyLoadStateTracker();
}

function asDailyLoadSource(error: unknown): Error {
	return error instanceof Error ? error : new Error(`Daily challenge load rejected: ${String(error)}`);
}
