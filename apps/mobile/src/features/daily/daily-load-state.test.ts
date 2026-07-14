import { describe, expect, it } from 'vitest';

import { DailyLoadError, createDailyLoadStateTracker } from './daily-load-state';

describe('daily load state tracker', () => {
	it('accepts the current resolve', () => {
		// Given: one active load sequence.
		const tracker = createDailyLoadStateTracker();
		const sequence = tracker.begin();

		// When: the current load resolves.
		const outcome = tracker.resolve(sequence);

		// Then: the helper reports the current load as settled.
		expect(outcome).toEqual({ kind: 'current', status: 'resolved' });
	});

	it('accepts the current reject', () => {
		// Given: one active load sequence.
		const tracker = createDailyLoadStateTracker();
		const sequence = tracker.begin();

		// When: the current load rejects with an Error.
		const outcome = tracker.reject(sequence, new Error('load failed'));

		// Then: the helper returns a typed loadError.
		expect(outcome.kind).toBe('current');
		if (outcome.kind !== 'current' || outcome.status !== 'rejected') throw new Error('expected current rejected load outcome');
		expect(outcome.loadError).toBeInstanceOf(DailyLoadError);
		expect(outcome.loadError.source).toBeInstanceOf(Error);
		expect(outcome.loadError.source.message).toBe('load failed');
	});

	it('ignores stale resolve', () => {
		// Given: a newer load has already started.
		const tracker = createDailyLoadStateTracker();
		const staleSequence = tracker.begin();
		const currentSequence = tracker.begin();

		// When: the older load resolves after the newer one.
		const outcome = tracker.resolve(staleSequence);

		// Then: the stale completion is ignored.
		expect(outcome).toEqual({ kind: 'stale' });
		expect(tracker.resolve(currentSequence)).toEqual({ kind: 'current', status: 'resolved' });
	});

	it('ignores stale reject', () => {
		// Given: a newer load has already started.
		const tracker = createDailyLoadStateTracker();
		const staleSequence = tracker.begin();
		const currentSequence = tracker.begin();

		// When: the older load rejects after the newer one.
		const outcome = tracker.reject(staleSequence, new Error('stale load failed'));

		// Then: the stale failure is ignored.
		expect(outcome).toEqual({ kind: 'stale' });
		expect(tracker.resolve(currentSequence)).toEqual({ kind: 'current', status: 'resolved' });
	});

	it('wraps non-Error rejection values in a typed loadError', () => {
		// Given: one active load sequence.
		const tracker = createDailyLoadStateTracker();
		const sequence = tracker.begin();

		// When: the current load rejects with a non-Error value.
		const outcome = tracker.reject(sequence, 'boom');

		// Then: the helper normalizes the rejection into a typed Error.
		expect(outcome.kind).toBe('current');
		if (outcome.kind !== 'current' || outcome.status !== 'rejected') throw new Error('expected current rejected load outcome');
		expect(outcome.loadError).toBeInstanceOf(DailyLoadError);
		expect(outcome.loadError.source.message).toBe('Daily challenge load rejected: boom');
	});
});
