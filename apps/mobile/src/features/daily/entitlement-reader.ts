/**
 * Seam between the daily challenge and the billing stack. The daily feature
 * must stay importable without native store modules, so the concrete reader
 * (the subscription service) is registered at app start.
 */
export type DailyEntitlementReader = {
	currentEntitlement(): Promise<boolean>;
	/** Notifies when the entitlement flips, so mounted daily screens can reload. */
	subscribeEntitlementChanged?(listener: () => void): () => void;
};

let registeredReader: DailyEntitlementReader | undefined;

export function registerDailyEntitlementReader(reader: DailyEntitlementReader): void {
	registeredReader = reader;
}

export function requireDailyEntitlementReader(): DailyEntitlementReader {
	if (registeredReader === undefined) throw new DailyEntitlementReaderMissingError();
	return registeredReader;
}

export function maybeDailyEntitlementReader(): DailyEntitlementReader | undefined {
	return registeredReader;
}

export class DailyEntitlementReaderMissingError extends Error {
	readonly name = 'DailyEntitlementReaderMissingError';

	constructor() {
		super('No DailyEntitlementReader registered: call registerDailyEntitlementReader at app start.');
	}
}
