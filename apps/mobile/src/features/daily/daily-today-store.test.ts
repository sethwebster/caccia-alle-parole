import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TodayChallengeIdStore } from './today-store';

type AppStateHandler = (status: string) => void;

const appStateHandlers = new Set<AppStateHandler>();

vi.mock('react-native', () => ({
	AppState: {
		addEventListener: (_event: string, handler: AppStateHandler) => {
			appStateHandlers.add(handler);
			return { remove: () => appStateHandlers.delete(handler) };
		},
	},
}));

function foreground(): void {
	for (const handler of appStateHandlers) handler('active');
}

beforeEach(() => {
	appStateHandlers.clear();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

/** Mutable clock so a test can move the device past local midnight. */
function clockAt(initial: Date): { readonly now: () => Date; set: (next: Date) => void } {
	let current = initial;
	return { now: () => current, set: (next) => { current = next; } };
}

describe('today challenge id store', () => {
	it('rolls to the next challenge when the midnight timer fires during an open session', () => {
		// Given: a session subscribed just before local midnight.
		const clock = clockAt(new Date(2026, 6, 9, 23, 59, 30));
		const store = new TodayChallengeIdStore(clock.now);
		const listener = vi.fn();
		store.subscribe(listener);
		expect(store.getSnapshot()).toBe('2026-07-09');

		// When: the clock crosses midnight and the scheduled timer fires.
		clock.set(new Date(2026, 6, 10, 0, 0, 1));
		vi.advanceTimersByTime(31_000);

		// Then: subscribers see the new challenge exactly once.
		expect(store.getSnapshot()).toBe('2026-07-10');
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('rolls forward on foreground when the background timer never fired', () => {
		// Given: a subscribed session backgrounded before midnight.
		const clock = clockAt(new Date(2026, 6, 9, 22, 0, 0));
		const store = new TodayChallengeIdStore(clock.now);
		const listener = vi.fn();
		store.subscribe(listener);

		// When: the app returns to the foreground two days later without any timer firing.
		clock.set(new Date(2026, 6, 11, 9, 0, 0));
		foreground();

		// Then: the store catches up to the real civil date.
		expect(store.getSnapshot()).toBe('2026-07-11');
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('keeps the same challenge and stays subscribed when nothing rolled over', () => {
		// Given: a subscribed session mid-morning.
		const clock = clockAt(new Date(2026, 6, 9, 9, 0, 0));
		const store = new TodayChallengeIdStore(clock.now);
		const listener = vi.fn();
		store.subscribe(listener);

		// When: the app foregrounds later the same day.
		clock.set(new Date(2026, 6, 9, 17, 30, 0));
		foreground();

		// Then: no spurious notification is emitted.
		expect(store.getSnapshot()).toBe('2026-07-09');
		expect(listener).not.toHaveBeenCalled();
	});

	it('releases the timer and app-state listener once the last subscriber leaves', () => {
		// Given: a single subscriber holding the clock resources.
		const clock = clockAt(new Date(2026, 6, 9, 23, 59, 30));
		const store = new TodayChallengeIdStore(clock.now);
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);
		expect(appStateHandlers.size).toBe(1);

		// When: it unsubscribes and the clock passes midnight.
		unsubscribe();
		clock.set(new Date(2026, 6, 10, 0, 0, 1));
		vi.advanceTimersByTime(31_000);

		// Then: nothing is left running to notify a dead subscriber.
		expect(appStateHandlers.size).toBe(0);
		expect(vi.getTimerCount()).toBe(0);
		expect(listener).not.toHaveBeenCalled();
	});
});
