import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { DAILY_COPY } from './daily-copy';
import { loadDailyArchiveModel, type DailyArchiveModel } from './daily-archive-model';

const INITIAL: DailyArchiveModel = {
	kind: 'loading',
	...DAILY_COPY.state.archiveLoading,
};

export function useDailyArchive(): DailyArchiveModel {
	const [model, setModel] = useState<DailyArchiveModel>(INITIAL);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			void loadDailyArchiveModel().then((next) => {
				if (alive) setModel(next);
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	return model;
}
