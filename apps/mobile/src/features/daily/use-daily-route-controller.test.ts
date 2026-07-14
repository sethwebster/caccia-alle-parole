import { describe, expect, it, vi } from 'vitest';

import { DailyRouteLaunchError, launchDailyRoutePuzzle } from './daily-route-launch';
import { makeChallengeId } from './date';
import { DailyLoadError } from './daily-load-state';
import { startPuzzleForMode } from './daily-route-start';
import { dailyLoadErrorModel, dailyRouteLaunchErrorModel, loadingDailyState } from './daily-state-copy';
import type { DailyChallengeOrchestrator } from './orchestrator-service';
import type { DailyRoutePuzzleModel, DailyRouteReadyModel } from './daily-route-model';

const context = {
	challengeId: makeChallengeId('2026-07-09'),
	puzzleKey: 'parola',
	attemptKind: 'official',
	attemptId: 'attempt-1',
	terminalEventId: 'terminal-1',
} as const;

describe('useDailyRouteController launch handling', () => {
	it('surfaces launch failures without navigating to a blank game route', async () => {
		const push = vi.fn();
		const onError = vi.fn();

		await launchDailyRoutePuzzle({
			href: '/parola',
			start: () => Promise.reject(new Error('launch failed')),
			push,
			onError,
		});

		expect(push).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'DailyRouteLaunchError' }));
	});

	it('navigates only after launch returns an active attempt context', async () => {
		const push = vi.fn();
		const onError = vi.fn();

		await launchDailyRoutePuzzle({
			href: '/parola',
			start: () => Promise.resolve({ context, startedAt: '2026-07-09T12:00:00.000Z' }),
			push,
			onError,
		});

		expect(onError).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			pathname: '/parola',
			params: {
				mode: 'challenge',
				challengeId: '2026-07-09',
				attemptKind: 'official',
				attemptId: 'attempt-1',
				terminalEventId: 'terminal-1',
			},
		});
	});

	it('maps launch failures to the localized daily error model without rendering a throw', () => {
		const launchError = new DailyRouteLaunchError(new Error('launch failed'));

		expect(dailyRouteLaunchErrorModel({ kind: 'loading', ...loadingDailyState() }, launchError)).toEqual({
			kind: 'error',
			eyebrow: 'AVVIO SFIDA',
			title: 'Sfida non avviata',
			message: 'Non siamo riusciti ad avviare la Sfida Giornaliera su questo dispositivo.',
			detail: 'Resta nella schermata: puoi riprovare senza perdere il progresso ufficiale.',
			tone: 'error',
		});
	});

  it('maps initialization load failures to the localized daily error model', () => {
    const loadError = new DailyLoadError(new Error('load failed'));

		expect(dailyLoadErrorModel({ kind: 'loading', ...loadingDailyState() }, loadError)).toEqual({
			kind: 'error',
			eyebrow: 'CARICAMENTO SFIDA',
			title: 'Sfida non caricata',
			message: 'Non siamo riusciti a caricare la Sfida Giornaliera su questo dispositivo.',
			detail: 'Chiudi e riapri l’app: i progressi ufficiali restano protetti.',
      tone: 'error',
    });
  });

  it('returns the orchestrator attempt directly even when the snapshot no longer includes it', async () => {
    const attempt = { context, startedAt: '2026-07-09T12:00:00.000Z' };
    const orchestrator = {
      startPuzzle: vi.fn().mockResolvedValue(attempt),
      startReplay: vi.fn(),
      startCurrentPuzzle: vi.fn(),
      getSnapshot: vi.fn(() => ({ kind: 'ready', mode: 'official', phase: 'notStarted', themeGate: 'locked' })),
    } as unknown as DailyChallengeOrchestrator;
    const model = {
      kind: 'ready',
      mode: 'official',
      phase: 'notStarted',
      currentPuzzleKey: 'parola',
    } as unknown as DailyRouteReadyModel;

		await expect(startPuzzleForMode(orchestrator, model, { key: 'parola' } as DailyRoutePuzzleModel)).resolves.toBe(attempt);

    expect(orchestrator.startPuzzle).toHaveBeenCalledWith({ puzzleKey: 'parola' });
    expect(orchestrator.startCurrentPuzzle).not.toHaveBeenCalled();
    expect(orchestrator.getSnapshot).not.toHaveBeenCalled();
  });
});
