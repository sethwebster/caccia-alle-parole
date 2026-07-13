import {
	fetchProducts,
	finishTransaction,
	getActiveSubscriptions,
	initConnection,
	purchaseErrorListener,
	purchaseUpdatedListener,
	requestPurchase,
	type Purchase,
} from 'expo-iap';

import type { SubscriptionSku } from './subscription-model';

export type IapProduct = {
	readonly sku: string;
	readonly title: string;
	readonly displayPrice: string;
	readonly hasFreeTrialOffer: boolean;
};

export type IapPurchaseEvent = {
	readonly sku: string;
	readonly state: 'purchased' | 'pending' | 'unknown';
	readonly finish: () => Promise<void>;
};

export type IapSubscription = { readonly remove: () => void };

/** Store-facing seam so the service stays testable without StoreKit. */
export type IapAdapter = {
	initConnection(): Promise<void>;
	fetchSubscriptionProducts(skus: readonly SubscriptionSku[]): Promise<readonly IapProduct[]>;
	hasActiveSubscription(skus: readonly SubscriptionSku[]): Promise<boolean>;
	requestSubscription(sku: SubscriptionSku): Promise<void>;
	onPurchaseUpdated(listener: (event: IapPurchaseEvent) => void): IapSubscription;
	onPurchaseError(listener: (code: string) => void): IapSubscription;
};

export function createExpoIapAdapter(): IapAdapter {
	return {
		async initConnection() {
			await initConnection();
		},
		async fetchSubscriptionProducts(skus) {
			const products = await fetchProducts({ skus: [...skus], type: 'subs' });
			return (products ?? []).map((product) => ({
				sku: product.id,
				title: product.title,
				displayPrice: product.displayPrice,
				hasFreeTrialOffer: hasFreeTrialOffer(product),
			}));
		},
		async hasActiveSubscription(skus) {
			const active = await getActiveSubscriptions([...skus]);
			return active.some((subscription) => subscription.isActive);
		},
		async requestSubscription(sku) {
			await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'subs' });
		},
		onPurchaseUpdated(listener) {
			return purchaseUpdatedListener((purchase: Purchase) => {
				listener({
					sku: purchase.productId,
					state: purchase.purchaseState === 'purchased' ? 'purchased' : purchase.purchaseState === 'pending' ? 'pending' : 'unknown',
					finish: async () => {
						await finishTransaction({ purchase, isConsumable: false });
					},
				});
			});
		},
		onPurchaseError(listener) {
			return purchaseErrorListener((error) => listener(error.code ?? 'unknown'));
		},
	};
}

function hasFreeTrialOffer(product: { readonly subscriptionOffers?: readonly { readonly type: string; readonly paymentMode?: string | null }[] | null }): boolean {
	return (product.subscriptionOffers ?? []).some((offer) => offer.type === 'introductory' && offer.paymentMode === 'free-trial');
}
