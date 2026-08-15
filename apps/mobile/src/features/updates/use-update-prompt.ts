import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getUpdateOfferStore, useDismissedOffer } from './update-offer-store';
import { selectUpdatePrompt, updateOfferKey, type UpdatePromptModel } from './update-prompt-model';
import { UPDATES_ENABLED } from './updates-runtime';

export type UpdatePromptController = {
	readonly model: UpdatePromptModel;
	readonly onPrimary: () => void;
	readonly onDismiss: () => void;
};

/** Re-checks on foreground, as the Expo docs advise, instead of polling on a timer. */
function useForegroundUpdateCheck(enabled: boolean): void {
	useEffect(() => {
		if (!enabled) return;
		const check = (): void => {
			void Updates.checkForUpdateAsync().catch(() => undefined);
		};
		check();
		const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
			if (status === 'active') check();
		});
		return () => subscription.remove();
	}, [enabled]);
}

export function useUpdatePrompt(): UpdatePromptController {
	const { isUpdateAvailable, isUpdatePending, isDownloading, isRestarting, availableUpdate, downloadedUpdate } = Updates.useUpdates();
	const dismissedOffer = useDismissedOffer();
	// Only a failure the player actually triggered is worth a card; a failed
	// startup download would otherwise greet them with an error they never asked for.
	const [failed, setFailed] = useState(false);
	// Guards a second tap while fetchUpdateAsync/reloadAsync is already in flight.
	const busy = useRef(false);

	useForegroundUpdateCheck(UPDATES_ENABLED);

	const offerKey = updateOfferKey({ availableUpdateId: availableUpdate?.updateId, downloadedUpdateId: downloadedUpdate?.updateId, isUpdatePending });
	const model = selectUpdatePrompt({
		enabled: UPDATES_ENABLED,
		isUpdateAvailable,
		isUpdatePending,
		isDownloading,
		isRestarting,
		dismissed: dismissedOffer === offerKey,
		failed,
	});

	const onPrimary = useCallback(() => {
		if (busy.current || model.primaryAction === 'none') return;
		busy.current = true;
		setFailed(false);
		const run = model.primaryAction === 'restart'
			? Updates.reloadAsync()
			: Updates.fetchUpdateAsync().then(() => Updates.reloadAsync());
		void run.catch(() => {
			busy.current = false;
			setFailed(true);
		});
	}, [model.primaryAction]);

	// Clearing the failure alongside the offer stops a dismissed error card from
	// immediately reappearing as the plain offer it was raised from.
	const onDismiss = useCallback(() => {
		if (!model.dismissible) return;
		setFailed(false);
		getUpdateOfferStore().dismiss(offerKey);
	}, [model.dismissible, offerKey]);

	return { model, onPrimary, onDismiss };
}
