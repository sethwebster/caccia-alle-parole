import { describe, expect, it } from 'vitest';

import { DailyRouteLaunchError } from './daily-route-launch';
import { makeChallengeId } from './date';
import { DAILY_COPY } from './daily-copy';
import { formatCatalogAvailability } from './daily-format';
import { dailyCatalogUpdateState, dailyLaunchErrorState } from './daily-state-copy';

describe('Daily Challenge Italian copy', () => {
	it('models update-required and corrupt-catalog states as visible Italian recovery copy', () => {
		expect(dailyCatalogUpdateState('outsideSupportedRange')).toMatchObject({ title: 'Aggiornamento richiesto', tone: 'warning' });
		expect(dailyCatalogUpdateState('corruptCatalog')).toMatchObject({ title: 'Catalogo da aggiornare', tone: 'error' });
	});

	it('centralizes launch failures as Italian error copy for the daily state card', () => {
		const state = dailyLaunchErrorState(new DailyRouteLaunchError(new Error('launch failed')));

		expect(state).toMatchObject({
			eyebrow: 'AVVIO SFIDA',
			title: 'Sfida non avviata',
			tone: 'error',
		});
	});

	it('keeps archive empty and catalog availability labels centralized', () => {
		expect(DAILY_COPY.state.archiveEmpty.title).toBe('Nessuna sfida archiviata');
		expect(formatCatalogAvailability(makeChallengeId('2026-07-09'))).toBe('Disponibile 9 luglio 2026');
	});
});
