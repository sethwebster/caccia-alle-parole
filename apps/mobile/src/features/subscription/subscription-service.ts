import type { IapAdapter } from './iap-adapter';
import {
	ALL_SUBSCRIPTION_SKUS,
	isSubscriptionSku,
	periodForSku,
	type EntitlementStatus,
	type SubscriptionSku,
	type SubscriptionSnapshot,
} from './subscription-model';

type SubscriptionServiceOptions = {
	readonly adapter: IapAdapter;
	readonly storeSupported: boolean;
};

const INITIAL_SNAPSHOT: SubscriptionSnapshot = { entitlement: 'unknown', products: [] };

/**
 * External store for StoreKit subscription state. The rest of the app only
 * consumes `entitlement` and the paywall actions; the IAP SDK stays sealed
 * inside this module so the billing backend can change in one place.
 */
export class SubscriptionService {
	private readonly adapter: IapAdapter;
	private readonly storeSupported: boolean;
	private snapshot: SubscriptionSnapshot = INITIAL_SNAPSHOT;
	private readonly listeners = new Set<() => void>();
	private configurePromise: Promise<void> | undefined;
	private refreshPromise: Promise<EntitlementStatus> | undefined;

	constructor(options: SubscriptionServiceOptions) {
		this.adapter = options.adapter;
		this.storeSupported = options.storeSupported;
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getSnapshot = (): SubscriptionSnapshot => this.snapshot;

	/** Resolves the current entitlement, connecting to the store on first use. */
	async currentEntitlement(): Promise<boolean> {
		if (!this.storeSupported) return false;
		await this.ensureConfigured();
		if (this.snapshot.entitlement !== 'unknown') return this.snapshot.entitlement === 'entitled';
		return (await this.refreshEntitlement()) === 'entitled';
	}

	async refreshEntitlement(): Promise<EntitlementStatus> {
		if (!this.storeSupported) return this.setSnapshot({ ...this.snapshot, entitlement: 'notEntitled' }).entitlement;
		await this.ensureConfigured();
		this.refreshPromise ??= this.adapter
			.hasActiveSubscription(ALL_SUBSCRIPTION_SKUS)
			.then((active) => this.setSnapshot({ ...this.snapshot, entitlement: active ? 'entitled' : 'notEntitled' }).entitlement)
			.catch(() => this.setSnapshot({ ...this.snapshot, entitlement: 'notEntitled', error: 'storeUnavailable' }).entitlement)
			.finally(() => {
				this.refreshPromise = undefined;
			});
		return this.refreshPromise;
	}

	async loadProducts(): Promise<void> {
		if (!this.storeSupported) return;
		await this.ensureConfigured();
		try {
			const products = await this.adapter.fetchSubscriptionProducts(ALL_SUBSCRIPTION_SKUS);
			const mapped = products
				.filter((product): product is typeof product & { sku: SubscriptionSku } => isSubscriptionSku(product.sku))
				.map((product) => ({
					sku: product.sku,
					period: periodForSku(product.sku),
					title: product.title,
					displayPrice: product.displayPrice,
					hasFreeTrial: product.hasFreeTrialOffer,
				}))
				.sort((left) => (left.period === 'annual' ? -1 : 1));
			this.setSnapshot({ ...this.snapshot, products: mapped, error: mapped.length === 0 ? 'productsUnavailable' : undefined });
		} catch {
			this.setSnapshot({ ...this.snapshot, error: 'productsUnavailable' });
		}
	}

	async purchase(sku: SubscriptionSku): Promise<void> {
		if (!this.storeSupported || this.snapshot.busy !== undefined) return;
		await this.ensureConfigured();
		this.setSnapshot({ ...this.snapshot, busy: 'purchase', error: undefined });
		try {
			await this.adapter.requestSubscription(sku);
		} catch {
			this.setSnapshot({ ...this.snapshot, busy: undefined, error: 'purchaseFailed' });
		}
	}

	async restore(): Promise<void> {
		if (!this.storeSupported || this.snapshot.busy !== undefined) return;
		await this.ensureConfigured();
		this.setSnapshot({ ...this.snapshot, busy: 'restore', error: undefined });
		const entitlement = await this.refreshEntitlement();
		this.setSnapshot({ ...this.snapshot, busy: undefined, error: entitlement === 'entitled' ? undefined : 'restoreFailed' });
	}

	private ensureConfigured(): Promise<void> {
		this.configurePromise ??= this.configure();
		return this.configurePromise;
	}

	private async configure(): Promise<void> {
		try {
			await this.adapter.initConnection();
		} catch {
			this.setSnapshot({ ...this.snapshot, entitlement: 'notEntitled', error: 'storeUnavailable' });
			return;
		}
		this.adapter.onPurchaseUpdated((event) => {
			void (async () => {
				if (event.state !== 'purchased' || !isSubscriptionSku(event.sku)) return;
				await event.finish();
				this.setSnapshot({ ...this.snapshot, entitlement: 'entitled', busy: undefined, error: undefined });
			})();
		});
		this.adapter.onPurchaseError(() => {
			this.setSnapshot({ ...this.snapshot, busy: undefined });
		});
	}

	private setSnapshot(snapshot: SubscriptionSnapshot): SubscriptionSnapshot {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener();
		return snapshot;
	}
}
