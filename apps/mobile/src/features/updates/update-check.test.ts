import { describe, expect, it, vi } from 'vitest';

import { UpdateOfferStore } from './update-offer-store';
import { selectUpdateCheck, updateCheckStatus, UPDATE_CHECK_COPY, type UpdateCheckPhase } from './update-prompt-model';

const CLEAR: { readonly isUpdateAvailable: boolean; readonly isUpdatePending: boolean } = { isUpdateAvailable: false, isUpdatePending: false };

describe('manual update check', () => {
	it('offers the action before anything has been checked', () => {
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'idle', ...CLEAR }));

		expect(model).toEqual({ label: UPDATE_CHECK_COPY.action, busy: false });
		expect(model.caption).toBeUndefined();
	});

	it('marks itself busy while the check runs so it cannot be tapped twice', () => {
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'checking', ...CLEAR }));

		expect(model).toMatchObject({ label: UPDATE_CHECK_COPY.checking, busy: true });
	});

	it('reports being up to date only when nothing is waiting', () => {
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'checked', ...CLEAR }));

		expect(model.caption).toBe(UPDATE_CHECK_COPY.upToDate);
	});

	it('reports a find when an update is available', () => {
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'checked', isUpdateAvailable: true, isUpdatePending: false }));

		expect(model.caption).toBe(UPDATE_CHECK_COPY.found);
	});

	it('reports a find when a bundle is already downloaded and waiting', () => {
		// checkForUpdateAsync answers "nothing new" once the bundle is fetched, so
		// live state has to win or the player is told they are up to date wrongly.
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'checked', isUpdateAvailable: false, isUpdatePending: true }));

		expect(model.caption).toBe(UPDATE_CHECK_COPY.found);
	});

	it('surfaces a failed check instead of claiming success', () => {
		const model = selectUpdateCheck(updateCheckStatus({ phase: 'failed', ...CLEAR }));

		expect(model.caption).toBe(UPDATE_CHECK_COPY.failed);
	});

	it('keeps showing a pending update even after a failed check', () => {
		const status = updateCheckStatus({ phase: 'failed', isUpdateAvailable: false, isUpdatePending: true });

		expect(status).toBe('failed');
	});

	it('never claims up to date while checking', () => {
		const phases: UpdateCheckPhase[] = ['idle', 'checking', 'checked', 'failed'];
		const captions = phases.map((phase) => selectUpdateCheck(updateCheckStatus({ phase, isUpdatePending: true, isUpdateAvailable: false })).caption);

		expect(captions).not.toContain(UPDATE_CHECK_COPY.upToDate);
	});
});

describe('update offer store', () => {
	it('notifies subscribers when an offer is put off and re-opened', () => {
		const store = new UpdateOfferStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.dismiss('update-1');
		expect(store.getSnapshot()).toBe('update-1');

		store.clear();
		expect(store.getSnapshot()).toBeUndefined();
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('stays quiet when nothing actually changed', () => {
		const store = new UpdateOfferStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.dismiss('update-1');
		store.dismiss('update-1');

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('lets an explicit check re-open a put-off update', () => {
		// The whole point of the Profile button: "Più tardi" must not silence it.
		const store = new UpdateOfferStore();
		store.dismiss('update-1');

		store.clear();

		expect(store.getSnapshot()).not.toBe('update-1');
	});

	it('drops a subscriber on unsubscribe', () => {
		const store = new UpdateOfferStore();
		const listener = vi.fn();
		store.subscribe(listener)();

		store.dismiss('update-1');

		expect(listener).not.toHaveBeenCalled();
	});
});
