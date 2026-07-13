import { useEffect, useState, useSyncExternalStore } from 'react';

import { getSubscriptionService } from './subscription-runtime';
import type { SubscriptionSnapshot } from './subscription-model';

/** Live subscription state; kicks off the store connection on first mount. */
export function useSubscriptionSnapshot(): { readonly snapshot: SubscriptionSnapshot; readonly service: ReturnType<typeof getSubscriptionService> } {
	const [service] = useState(getSubscriptionService);
	const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
	useEffect(() => {
		void service.refreshEntitlement();
	}, [service]);
	return { snapshot, service };
}

export function useEntitlement(): SubscriptionSnapshot['entitlement'] {
	return useSubscriptionSnapshot().snapshot.entitlement;
}
