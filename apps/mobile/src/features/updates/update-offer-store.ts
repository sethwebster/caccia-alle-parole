import { useState, useSyncExternalStore } from 'react';

/**
 * Remembers which update the player put off. It lives outside the prompt because
 * asking for a check by hand has to be able to clear it — otherwise "Controlla
 * aggiornamenti" would find the update it already knows about and show nothing.
 */
export class UpdateOfferStore {
	private dismissedOffer: string | undefined;
	private readonly listeners = new Set<() => void>();

	getSnapshot = (): string | undefined => this.dismissedOffer;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	dismiss = (offerKey: string): void => {
		this.setDismissedOffer(offerKey);
	};

	/** Re-opens whatever was put off, so an explicit check always gets to speak. */
	clear = (): void => {
		this.setDismissedOffer(undefined);
	};

	private setDismissedOffer(offerKey: string | undefined): void {
		if (this.dismissedOffer === offerKey) return;
		this.dismissedOffer = offerKey;
		for (const listener of this.listeners) listener();
	}
}

let updateOfferStore: UpdateOfferStore | undefined;

export function getUpdateOfferStore(): UpdateOfferStore {
	updateOfferStore ??= new UpdateOfferStore();
	return updateOfferStore;
}

export function useDismissedOffer(): string | undefined {
	const [store] = useState(getUpdateOfferStore);
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
