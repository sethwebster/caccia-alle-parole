import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { usePaywallLocale } from './paywall-locale';
import { PAYWALL_COPY, type PaywallCopy, type PaywallLocale } from './subscription-copy';
import type { PaywallProduct, SubscriptionSku } from './subscription-model';
import { useSubscriptionSnapshot } from './use-entitlement';

export type PaywallModel = {
	readonly copy: PaywallCopy;
	readonly locale: PaywallLocale;
	readonly products: readonly PaywallProduct[];
	readonly selectedSku: SubscriptionSku | undefined;
	readonly loadingProducts: boolean;
	readonly busy: 'purchase' | 'restore' | undefined;
	readonly errorMessage: string | undefined;
	readonly subscribeLabel: string;
};

export type PaywallActions = {
	readonly select: (sku: SubscriptionSku) => void;
	readonly subscribe: () => void;
	readonly restore: () => void;
	readonly dismiss: () => void;
};

/** Drives the paywall route: loads offers, tracks selection, closes on entitlement. */
export function usePaywallController(): { readonly model: PaywallModel; readonly actions: PaywallActions } {
	const router = useRouter();
	const { snapshot, service } = useSubscriptionSnapshot();
	const { locale } = usePaywallLocale();
	const copy = PAYWALL_COPY[locale];
	const [selection, setSelection] = useState<SubscriptionSku>();

	useEffect(() => {
		void service.loadProducts();
	}, [service]);

	const dismiss = useCallback(() => {
		if (router.canGoBack()) router.back();
		else router.replace('/');
	}, [router]);

	useEffect(() => {
		if (snapshot.entitlement === 'entitled') dismiss();
	}, [snapshot.entitlement, dismiss]);

	const selectedSku = selection ?? snapshot.products[0]?.sku;
	const selectedProduct = snapshot.products.find((product) => product.sku === selectedSku);

	return {
		model: {
			copy,
			locale,
			products: snapshot.products,
			selectedSku,
			loadingProducts: snapshot.products.length === 0 && snapshot.error === undefined,
			busy: snapshot.busy,
			errorMessage: snapshot.error === undefined ? undefined : copy.error[snapshot.error],
			subscribeLabel: subscribeLabel(copy, snapshot.busy, selectedProduct),
		},
		actions: {
			select: setSelection,
			subscribe: () => {
				if (selectedSku !== undefined) void service.purchase(selectedSku);
			},
			restore: () => {
				void service.restore();
			},
			dismiss,
		},
	};
}

function subscribeLabel(copy: PaywallCopy, busy: 'purchase' | 'restore' | undefined, product: PaywallProduct | undefined): string {
	if (busy === 'purchase') return copy.purchaseBusy;
	if (product?.hasFreeTrial === true) return copy.subscribe;
	return copy.subscribeNoTrial;
}
