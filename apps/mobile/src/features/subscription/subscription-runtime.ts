import { Platform } from 'react-native';

import type { DailyEntitlementReader } from '@/features/daily/entitlement-reader';

import { createExpoIapAdapter } from './iap-adapter';
import { SubscriptionService } from './subscription-service';

let subscriptionService: SubscriptionService | undefined;

/** App-runtime singleton; keep native store imports out of the pure service. */
export function getSubscriptionService(): SubscriptionService {
	subscriptionService ??= new SubscriptionService({ adapter: createExpoIapAdapter(), storeSupported: Platform.OS === 'ios' });
	return subscriptionService;
}

export function dailyEntitlementReaderForService(service: SubscriptionService): DailyEntitlementReader {
	return {
		currentEntitlement: () => service.currentEntitlement(),
		subscribeEntitlementChanged(listener) {
			let last = service.getSnapshot().entitlement;
			return service.subscribe(() => {
				const next = service.getSnapshot().entitlement;
				if (next === last) return;
				last = next;
				listener();
			});
		},
	};
}
