import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	completionWritePolicy,
	DAILY_CHALLENGE_PLAY_MODE,
	PRACTICE_PLAY_MODE,
	PRACTICE_ROUTES,
	resolveGamePlayMode,
} from './route-policy';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const directRoutes = [
	'app/parola.tsx',
	'app/caccia.tsx',
	'app/paroliere.tsx',
	'app/impiccato.tsx',
	'app/anagrammi.tsx',
] as const;

const practiceSurfaces = [
	...directRoutes,
	'features/parola/parola-screen.tsx',
	'features/caccia/word-search-screen.tsx',
	'features/paroliere/paroliere-screen.tsx',
	'features/impiccato/impiccato-screen.tsx',
	'features/anagrammi/anagrammi-screen.tsx',
] as const;

describe('daily route policy', () => {
	it('routes the primary home CTA to Daily Challenge instead of the standalone library', () => {
		const home = source('app/(tabs)/index.tsx');

		expect(home).toContain("router.push('/daily')");
		expect(home).toContain('DAILY_HOME_ROUTE.title');
		expect(home).toContain('Allenamento libero');
		expect(home).not.toContain('Tutti i giochi');
		expect(source('features/daily/use-daily-route-controller.ts')).toContain('launchDailyRoutePuzzle');
		expect(source('features/daily/daily-route-launch.ts')).toContain('challengeStepHref');
			expect(source('app/daily.tsx')).toContain('useDailyRouteController');
			expect(source('app/daily.tsx')).not.toContain('useLocalSearchParams');
			expect(source('app/daily.tsx')).not.toContain('startPuzzleForMode');
			expect(PRACTICE_ROUTES.map((route) => route.href)).toEqual(['/parola', '/caccia', '/paroliere', '/impiccato', '/anagrammi']);
		});

	it('rejects stale or forged challenge route sessions before gameplay starts', () => {
		const routeHook = source('features/daily/use-daily-game-route-mode.ts');

		expect(routeHook).toContain('activeAttemptMatches');
		expect(routeHook).toContain('snapshot.bundle.challengeId !== context.challengeId');
		expect(routeHook).toContain('snapshot.mode !== context.attemptKind');
		expect(routeHook).toContain('activeAttemptMatches(routeSnapshot.activeAttempt, context)');
	});

	it('surfaces route and terminal write failures instead of falling back or discarding results', () => {
		const dailyController = source('features/daily/use-daily-route-controller.ts');
		const terminalRecorder = source('features/daily/use-daily-terminal-recorder.ts');

		expect(dailyController).toContain('invalidDailyRouteState');
		expect(dailyController).not.toContain('return undefined');
		expect(terminalRecorder).toContain("result.kind === 'rejected'");
		expect(terminalRecorder).not.toContain('void challenge.recordTerminal');
	});

	it('keeps every direct game route in Allenamento mode', () => {
		for (const route of directRoutes) {
			const routeSource = source(route);

			expect(routeSource).toContain('useDailyGameRouteMode');
			expect(routeSource).toContain('routeSession={routeSession}');
		}

		for (const screen of practiceSurfaces.slice(directRoutes.length)) {
			expect(source(screen)).toContain('formatPlayModeSubtitle');
		}

		expect(PRACTICE_PLAY_MODE.label).toBe('Allenamento');
	});

	it('resolves challenge launches separately from direct practice launches', () => {
		expect(resolveGamePlayMode({})).toEqual(PRACTICE_PLAY_MODE);
		expect(resolveGamePlayMode({ mode: 'challenge' })).toEqual(DAILY_CHALLENGE_PLAY_MODE);
		expect(resolveGamePlayMode({ mode: ['challenge'] })).toEqual(DAILY_CHALLENGE_PLAY_MODE);
		expect(completionWritePolicy(PRACTICE_PLAY_MODE)).toEqual({ kind: 'practiceOnly' });
		expect(completionWritePolicy(DAILY_CHALLENGE_PLAY_MODE)).toEqual({ kind: 'officialDaily', attemptKind: 'official' });
	});

	it('does not wire practice surfaces to official daily progress writes', () => {
		for (const surface of practiceSurfaces) {
			const surfaceSource = source(surface);

			expect(surfaceSource).not.toMatch(/DailyProgressMutationQueue|dailyProgressMutationQueue/);
			expect(surfaceSource).not.toMatch(/recordPuzzleTerminal|savePuzzleProgress|recordThemeQuizResult/);
		}
	});
});
