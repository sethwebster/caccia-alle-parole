export const SUBSCRIPTION_SKUS = {
	annual: 'com.sethwebster.cacciaparole.sub.annual',
	monthly: 'com.sethwebster.cacciaparole.sub.monthly',
} as const;

export type SubscriptionSku = (typeof SUBSCRIPTION_SKUS)[keyof typeof SUBSCRIPTION_SKUS];

export const ALL_SUBSCRIPTION_SKUS: readonly SubscriptionSku[] = [SUBSCRIPTION_SKUS.annual, SUBSCRIPTION_SKUS.monthly];

export type EntitlementStatus = 'unknown' | 'entitled' | 'notEntitled';

export type PaywallProduct = {
	readonly sku: SubscriptionSku;
	readonly period: 'annual' | 'monthly';
	readonly title: string;
	readonly displayPrice: string;
	readonly hasFreeTrial: boolean;
};

export type SubscriptionOperation = 'purchase' | 'restore';

export type SubscriptionErrorKind = 'storeUnavailable' | 'productsUnavailable' | 'purchaseFailed' | 'restoreFailed';

export type SubscriptionSnapshot = {
	readonly entitlement: EntitlementStatus;
	readonly products: readonly PaywallProduct[];
	readonly busy?: SubscriptionOperation;
	readonly error?: SubscriptionErrorKind;
};

export function isSubscriptionSku(value: string): value is SubscriptionSku {
	return ALL_SUBSCRIPTION_SKUS.includes(value as SubscriptionSku);
}

export function periodForSku(sku: SubscriptionSku): 'annual' | 'monthly' {
	return sku === SUBSCRIPTION_SKUS.annual ? 'annual' : 'monthly';
}
