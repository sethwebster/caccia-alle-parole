import { describe, expect, it } from 'vitest';

import type { IapAdapter, IapProduct, IapPurchaseEvent } from './iap-adapter';
import { SUBSCRIPTION_SKUS } from './subscription-model';
import { SubscriptionService } from './subscription-service';

class FakeIapAdapter implements IapAdapter {
	products: IapProduct[] = [];
	activeSkus = new Set<string>();
	initError: Error | undefined;
	entitlementError: Error | undefined;
	purchaseError: Error | undefined;
	finished: string[] = [];
	initCalls = 0;
	private purchaseListener: ((event: IapPurchaseEvent) => void) | undefined;
	private errorListener: ((code: string) => void) | undefined;

	async initConnection(): Promise<void> {
		this.initCalls += 1;
		if (this.initError) throw this.initError;
	}

	async fetchSubscriptionProducts(): Promise<readonly IapProduct[]> {
		return this.products;
	}

	async hasActiveSubscription(skus: readonly string[]): Promise<boolean> {
		if (this.entitlementError) throw this.entitlementError;
		return skus.some((sku) => this.activeSkus.has(sku));
	}

	async requestSubscription(sku: string): Promise<void> {
		if (this.purchaseError) throw this.purchaseError;
		void sku;
	}

	onPurchaseUpdated(listener: (event: IapPurchaseEvent) => void) {
		this.purchaseListener = listener;
		return { remove: () => undefined };
	}

	onPurchaseError(listener: (code: string) => void) {
		this.errorListener = listener;
		return { remove: () => undefined };
	}

	emitPurchase(sku: string): void {
		this.purchaseListener?.({
			sku,
			state: 'purchased',
			finish: async () => {
				this.finished.push(sku);
			},
		});
	}

	emitPurchaseError(code: string): void {
		this.errorListener?.(code);
	}
}

function makeService(adapter: FakeIapAdapter, storeSupported = true): SubscriptionService {
	return new SubscriptionService({ adapter, storeSupported });
}

async function flushMicrotasks(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SubscriptionService entitlement', () => {
	it('reports entitled when the store has an active subscription', async () => {
		const adapter = new FakeIapAdapter();
		adapter.activeSkus.add(SUBSCRIPTION_SKUS.annual);
		const service = makeService(adapter);
		expect(await service.currentEntitlement()).toBe(true);
		expect(service.getSnapshot().entitlement).toBe('entitled');
	});

	it('reports notEntitled when the store has no active subscription', async () => {
		const service = makeService(new FakeIapAdapter());
		expect(await service.currentEntitlement()).toBe(false);
		expect(service.getSnapshot().entitlement).toBe('notEntitled');
	});

	it('reports notEntitled with storeUnavailable when the entitlement check fails', async () => {
		const adapter = new FakeIapAdapter();
		adapter.entitlementError = new Error('offline');
		const service = makeService(adapter);
		expect(await service.currentEntitlement()).toBe(false);
		expect(service.getSnapshot().error).toBe('storeUnavailable');
	});

	it('never touches the store on unsupported platforms', async () => {
		const adapter = new FakeIapAdapter();
		const service = makeService(adapter, false);
		expect(await service.currentEntitlement()).toBe(false);
		expect(adapter.initCalls).toBe(0);
	});

	it('connects to the store only once across calls', async () => {
		const adapter = new FakeIapAdapter();
		const service = makeService(adapter);
		await Promise.all([service.currentEntitlement(), service.refreshEntitlement(), service.loadProducts()]);
		expect(adapter.initCalls).toBe(1);
	});
});

describe('SubscriptionService purchase flow', () => {
	it('finishes the transaction and becomes entitled on purchase', async () => {
		const adapter = new FakeIapAdapter();
		const service = makeService(adapter);
		await service.purchase(SUBSCRIPTION_SKUS.annual);
		expect(service.getSnapshot().busy).toBe('purchase');
		adapter.emitPurchase(SUBSCRIPTION_SKUS.annual);
		await flushMicrotasks();
		expect(adapter.finished).toEqual([SUBSCRIPTION_SKUS.annual]);
		expect(service.getSnapshot()).toMatchObject({ entitlement: 'entitled', busy: undefined });
	});

	it('clears busy when the store reports a purchase error (including user cancel)', async () => {
		const adapter = new FakeIapAdapter();
		const service = makeService(adapter);
		await service.purchase(SUBSCRIPTION_SKUS.monthly);
		adapter.emitPurchaseError('E_USER_CANCELLED');
		expect(service.getSnapshot().busy).toBeUndefined();
	});

	it('surfaces purchaseFailed when the purchase request throws', async () => {
		const adapter = new FakeIapAdapter();
		adapter.purchaseError = new Error('store down');
		const service = makeService(adapter);
		await service.purchase(SUBSCRIPTION_SKUS.annual);
		expect(service.getSnapshot()).toMatchObject({ busy: undefined, error: 'purchaseFailed' });
	});

	it('ignores purchase events for unknown products', async () => {
		const adapter = new FakeIapAdapter();
		const service = makeService(adapter);
		await service.refreshEntitlement();
		adapter.emitPurchase('some.other.product');
		await flushMicrotasks();
		expect(adapter.finished).toEqual([]);
		expect(service.getSnapshot().entitlement).toBe('notEntitled');
	});
});

describe('SubscriptionService restore', () => {
	it('restores entitlement from the store', async () => {
		const adapter = new FakeIapAdapter();
		adapter.activeSkus.add(SUBSCRIPTION_SKUS.monthly);
		const service = makeService(adapter);
		await service.restore();
		expect(service.getSnapshot()).toMatchObject({ entitlement: 'entitled', busy: undefined, error: undefined });
	});

	it('reports restoreFailed when nothing is active', async () => {
		const service = makeService(new FakeIapAdapter());
		await service.restore();
		expect(service.getSnapshot()).toMatchObject({ entitlement: 'notEntitled', busy: undefined, error: 'restoreFailed' });
	});
});

describe('SubscriptionService products', () => {
	it('maps store products with annual first and trial flags', async () => {
		const adapter = new FakeIapAdapter();
		adapter.products = [
			{ sku: SUBSCRIPTION_SKUS.monthly, title: 'Premium Mensile', displayPrice: '4,99 €', hasFreeTrialOffer: true },
			{ sku: SUBSCRIPTION_SKUS.annual, title: 'Premium Annuale', displayPrice: '34,99 €', hasFreeTrialOffer: true },
			{ sku: 'unrelated.product', title: 'Altro', displayPrice: '0,99 €', hasFreeTrialOffer: false },
		];
		const service = makeService(adapter);
		await service.loadProducts();
		const products = service.getSnapshot().products;
		expect(products.map((product) => product.period)).toEqual(['annual', 'monthly']);
		expect(products[0]).toMatchObject({ sku: SUBSCRIPTION_SKUS.annual, displayPrice: '34,99 €', hasFreeTrial: true });
	});

	it('flags productsUnavailable when the store returns nothing', async () => {
		const service = makeService(new FakeIapAdapter());
		await service.loadProducts();
		expect(service.getSnapshot().error).toBe('productsUnavailable');
	});
});
