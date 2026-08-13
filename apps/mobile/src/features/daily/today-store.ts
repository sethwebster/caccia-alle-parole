import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { useState, useSyncExternalStore } from 'react';

import { challengeIdForDate } from './date';
import type { ChallengeId } from './types';

/** Fire just past midnight so a timer that lands early still reads the new civil date. */
const MIDNIGHT_BUFFER_MS = 1000;

/**
 * Tracks the local civil date the app should be playing. A session left open
 * across midnight would otherwise hold yesterday's challenge forever: the load
 * key never changed, and the orchestrator caches its snapshot. Both the
 * midnight timer and returning to the foreground recompute it, so a suspended
 * timer (iOS throttles background JS) can never strand the app on a stale day.
 */
export class TodayChallengeIdStore {
	private challengeId: ChallengeId;
	private readonly listeners = new Set<() => void>();
	private timer: ReturnType<typeof setTimeout> | undefined;
	private appState: NativeEventSubscription | undefined;

	constructor(private readonly now: () => Date = () => new Date()) {
		this.challengeId = challengeIdForDate(this.now());
	}

	getSnapshot = (): ChallengeId => this.challengeId;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		if (this.listeners.size === 1) this.start();
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) this.stop();
		};
	};

	/** Recomputes the civil date and rearms the timer; safe to call from any trigger. */
	refresh = (): void => {
		const next = challengeIdForDate(this.now());
		this.scheduleMidnight();
		if (next === this.challengeId) return;
		this.challengeId = next;
		for (const listener of this.listeners) listener();
	};

	private handleAppStateChange = (status: AppStateStatus): void => {
		if (status === 'active') this.refresh();
	};

	/**
	 * Seeds the date without notifying — React re-reads the snapshot right after
	 * subscribing, so notifying mid-subscribe would only risk a commit-time loop.
	 */
	private start(): void {
		this.appState = AppState.addEventListener('change', this.handleAppStateChange);
		this.challengeId = challengeIdForDate(this.now());
		this.scheduleMidnight();
	}

	private stop(): void {
		this.appState?.remove();
		this.appState = undefined;
		this.clearTimer();
	}

	private scheduleMidnight(): void {
		this.clearTimer();
		if (this.listeners.size === 0) return;
		this.timer = setTimeout(this.refresh, this.millisecondsUntilMidnight());
	}

	private clearTimer(): void {
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;
	}

	private millisecondsUntilMidnight(): number {
		const now = this.now();
		const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		return Math.max(midnight.getTime() - now.getTime() + MIDNIGHT_BUFFER_MS, MIDNIGHT_BUFFER_MS);
	}
}

let todayChallengeIdStore: TodayChallengeIdStore | undefined;

export function getTodayChallengeIdStore(): TodayChallengeIdStore {
	todayChallengeIdStore ??= new TodayChallengeIdStore();
	return todayChallengeIdStore;
}

export function useTodayChallengeId(): ChallengeId {
	const [store] = useState(getTodayChallengeIdStore);
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
