import { describe, expect, it } from 'vitest';

import { selectUpdatePrompt, updateOfferKey, UPDATE_PROMPT_COPY, type UpdatePromptState } from './update-prompt-model';

const IDLE: UpdatePromptState = {
	enabled: true,
	isUpdatePending: false,
	isUpdateAvailable: false,
	isDownloading: false,
	isRestarting: false,
	dismissed: false,
	failed: false,
};

describe('update prompt', () => {
	it('stays hidden with nothing to offer', () => {
		expect(selectUpdatePrompt(IDLE).visible).toBe(false);
	});

	it('offers an immediate restart when a bundle is already downloaded', () => {
		// Given: expo-updates downloaded on launch and is holding it for the next cold start.
		const model = selectUpdatePrompt({ ...IDLE, isUpdatePending: true });

		// Then: the player can take it now, with no download step.
		expect(model).toMatchObject({ visible: true, primaryAction: 'restart', title: UPDATE_PROMPT_COPY.ready.title, dismissible: true });
	});

	it('offers to fetch when an update exists but is not downloaded yet', () => {
		const model = selectUpdatePrompt({ ...IDLE, isUpdateAvailable: true });

		expect(model).toMatchObject({ visible: true, primaryAction: 'download', title: UPDATE_PROMPT_COPY.available.title });
	});

	it('prefers restarting over downloading when both are true', () => {
		// Given: a newer update was found while an earlier one is already pending.
		const model = selectUpdatePrompt({ ...IDLE, isUpdatePending: true, isUpdateAvailable: true });

		// Then: the ready bundle wins, so the player never waits when they need not.
		expect(model.primaryAction).toBe('restart');
	});

	it('locks the card shut while the download runs', () => {
		const model = selectUpdatePrompt({ ...IDLE, isUpdateAvailable: true, isDownloading: true });

		expect(model).toMatchObject({ visible: true, primaryAction: 'none', dismissible: false });
		expect(model.secondaryLabel).toBeUndefined();
	});

	it('hides itself while the app is restarting', () => {
		expect(selectUpdatePrompt({ ...IDLE, isUpdatePending: true, isRestarting: true }).visible).toBe(false);
	});

	it('stays silent where the updates API cannot run', () => {
		// Dev builds and Expo Go reject checkForUpdateAsync outright.
		expect(selectUpdatePrompt({ ...IDLE, enabled: false, isUpdatePending: true }).visible).toBe(false);
	});

	it('respects "Più tardi" for the offer that was dismissed', () => {
		expect(selectUpdatePrompt({ ...IDLE, isUpdatePending: true, dismissed: true }).visible).toBe(false);
		expect(selectUpdatePrompt({ ...IDLE, isUpdateAvailable: true, dismissed: true }).visible).toBe(false);
	});

	it('offers a retry after a failed download, and can still be closed', () => {
		const model = selectUpdatePrompt({ ...IDLE, isUpdateAvailable: true, failed: true });

		expect(model).toMatchObject({ visible: true, primaryAction: 'download', title: UPDATE_PROMPT_COPY.failed.title, dismissible: true });
		expect(model.secondaryLabel).toBe(UPDATE_PROMPT_COPY.failed.secondary);
	});

	it('hides a dismissed failure instead of falling back to the plain offer', () => {
		expect(selectUpdatePrompt({ ...IDLE, isUpdateAvailable: true, failed: true, dismissed: true }).visible).toBe(false);
	});
});

describe('update offer identity', () => {
	it('keys on the downloaded update so a later one prompts again', () => {
		const first = updateOfferKey({ downloadedUpdateId: 'update-1', isUpdatePending: true });
		const second = updateOfferKey({ downloadedUpdateId: 'update-2', isUpdatePending: true });

		expect(first).toBe('update-1');
		expect(second).not.toBe(first);
	});

	it('prefers the downloaded id over the available one so a dismissal survives the download', () => {
		expect(updateOfferKey({ availableUpdateId: 'update-1', downloadedUpdateId: 'update-1', isUpdatePending: true })).toBe('update-1');
	});

	it('always yields a key so a prompt without an id is still dismissible', () => {
		expect(updateOfferKey({ isUpdatePending: true })).toBe('pending');
		expect(updateOfferKey({ isUpdatePending: false })).toBe('available');
	});
});
