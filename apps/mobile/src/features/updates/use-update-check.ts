import * as Updates from 'expo-updates';
import { useCallback, useRef, useState } from 'react';

import { getUpdateOfferStore } from './update-offer-store';
import { selectUpdateCheck, updateCheckStatus, type UpdateCheckModel, type UpdateCheckPhase } from './update-prompt-model';
import { UPDATES_ENABLED } from './updates-runtime';

export type UpdateCheckController = {
	readonly enabled: boolean;
	readonly model: UpdateCheckModel;
	readonly check: () => void;
};

export function useUpdateCheck(): UpdateCheckController {
	const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
	const [phase, setPhase] = useState<UpdateCheckPhase>('idle');
	// Guards a second tap while a check is already in flight.
	const busy = useRef(false);

	const check = useCallback(() => {
		if (busy.current || !UPDATES_ENABLED) return;
		busy.current = true;
		setPhase('checking');
		// An explicit check overrides an earlier "Più tardi": the player is asking
		// to see it again, so a put-off update must be allowed to prompt.
		getUpdateOfferStore().clear();
		void Updates.checkForUpdateAsync().then(
			() => {
				busy.current = false;
				setPhase('checked');
			},
			() => {
				busy.current = false;
				setPhase('failed');
			},
		);
	}, []);

	return {
		enabled: UPDATES_ENABLED,
		model: selectUpdateCheck(updateCheckStatus({ phase, isUpdateAvailable, isUpdatePending })),
		check,
	};
}
