import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useEntitlement } from '@/features/subscription/use-entitlement';

import { DAILY_COPY } from './daily-copy';
import { loadDailyArchiveModel, type DailyArchiveModel } from './daily-archive-model';

const INITIAL: DailyArchiveModel = {
	kind: 'loading',
	...DAILY_COPY.state.archiveLoading,
};

export function useDailyArchive(): DailyArchiveModel {
	const [model, setModel] = useState<DailyArchiveModel>(INITIAL);
	const entitlement = useEntitlement();

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			void loadDailyArchiveModel({ entitled: entitlement === 'entitled' }).then((next) => {
				if (alive) setModel(next);
			});
			return () => {
				alive = false;
			};
		}, [entitlement]),
	);

	return model;
}
