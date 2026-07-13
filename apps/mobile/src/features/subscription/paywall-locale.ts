import { useEffect, useSyncExternalStore } from 'react';

import { loadJSON, saveJSON } from '@/lib/storage';

import type { PaywallLocale } from './subscription-copy';

const KEY = 'subscription:paywall-locale:v1';

let currentLocale: PaywallLocale = 'it';
let hydrateStarted = false;
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getLocale(): PaywallLocale {
	return currentLocale;
}

export function setPaywallLocale(locale: PaywallLocale): void {
	currentLocale = locale;
	notify();
	void saveJSON(KEY, locale);
}

function hydrateOnce(): void {
	if (hydrateStarted) return;
	hydrateStarted = true;
	void loadJSON<unknown>(KEY).then((stored) => {
		if (stored === 'it' || stored === 'en') {
			currentLocale = stored;
			notify();
		}
	});
}

/** Persisted paywall language, shared by the gate card and the paywall route. */
export function usePaywallLocale(): { readonly locale: PaywallLocale; readonly setLocale: (locale: PaywallLocale) => void } {
	const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
	useEffect(hydrateOnce, []);
	return { locale, setLocale: setPaywallLocale };
}
