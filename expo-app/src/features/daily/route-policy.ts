import type { DailyPuzzleKey, TerminalAttemptContext } from './types';

export type GameHref = '/parola' | '/caccia' | '/paroliere' | '/impiccato' | '/anagrammi';

export type GamePlayMode =
	| { readonly kind: 'practice'; readonly label: 'Allenamento'; readonly officialDailyWrites: false }
	| { readonly kind: 'challenge'; readonly label: 'Sfida Giornaliera'; readonly officialDailyWrites: true };

export type CompletionWritePolicy =
	| { readonly kind: 'practiceOnly' }
	| { readonly kind: 'officialDaily'; readonly attemptKind: 'official' };

export type PracticeRoute = {
	readonly puzzleKey: DailyPuzzleKey;
	readonly href: GameHref;
	readonly icon: string;
	readonly title: string;
	readonly subtitle: string;
	readonly badge?: string;
};

export type GameRouteParams = {
	readonly mode?: string | readonly string[];
	readonly challengeId?: string | readonly string[];
	readonly attemptKind?: string | readonly string[];
	readonly attemptId?: string | readonly string[];
	readonly terminalEventId?: string | readonly string[];
};

export type ChallengeStepRoute = {
	readonly pathname: GameHref;
	readonly params: {
		readonly mode: 'challenge';
		readonly challengeId: string;
		readonly attemptKind: TerminalAttemptContext['attemptKind'];
		readonly attemptId: string;
		readonly terminalEventId: string;
	};
};

export const DAILY_HOME_ROUTE = {
	href: '/daily',
	title: 'Sfida Giornaliera',
	overline: 'SFIDA GIORNALIERA',
	subtitle: 'Cinque giochi, un tema nascosto da scoprire',
	cta: 'Inizia la sfida',
} as const;

export const PRACTICE_PLAY_MODE: GamePlayMode = {
	kind: 'practice',
	label: 'Allenamento',
	officialDailyWrites: false,
};

export const DAILY_CHALLENGE_PLAY_MODE: GamePlayMode = {
	kind: 'challenge',
	label: 'Sfida Giornaliera',
	officialDailyWrites: true,
};

export const PRACTICE_ROUTES = [
	{
		puzzleKey: 'parola',
		href: '/parola',
		icon: '🟩',
		title: 'Paròle',
		subtitle: 'Indovina la parola in sei tentativi',
	},
	{
		puzzleKey: 'caccia',
		href: '/caccia',
		icon: '🔍',
		title: 'Caccia alle Paròle',
		subtitle: 'Trova le parole nascoste nella griglia',
	},
	{
		puzzleKey: 'paroliere',
		href: '/paroliere',
		icon: '🎭',
		title: 'Paroliere+',
		subtitle: 'Collega le lettere, batti il tempo',
		badge: 'Nuovo',
	},
	{
		puzzleKey: 'impiccato',
		href: '/impiccato',
		icon: '🎈',
		title: 'Il Palloncino',
		subtitle: 'Indovina la parola prima che scoppi',
	},
	{
		puzzleKey: 'anagrammi',
		href: '/anagrammi',
		icon: '🔀',
		title: 'Anagrammi+',
		subtitle: 'Riordina le lettere contro il tempo',
	},
] as const satisfies readonly PracticeRoute[];

export function resolveGamePlayMode(params: GameRouteParams): GamePlayMode {
	return firstParam(params.mode) === 'challenge' ? DAILY_CHALLENGE_PLAY_MODE : PRACTICE_PLAY_MODE;
}

export function formatPlayModeSubtitle(playMode: GamePlayMode, subtitle?: string): string {
	return subtitle === undefined ? playMode.label : `${playMode.label} • ${subtitle}`;
}

export function challengeStepHref(href: GameHref, context: TerminalAttemptContext): ChallengeStepRoute {
	return {
		pathname: href,
		params: {
			mode: 'challenge',
			challengeId: context.challengeId,
			attemptKind: context.attemptKind,
			attemptId: context.attemptId,
			terminalEventId: context.terminalEventId,
		},
	};
}

export function completionWritePolicy(playMode: GamePlayMode): CompletionWritePolicy {
	switch (playMode.kind) {
		case 'practice':
			return { kind: 'practiceOnly' };
		case 'challenge':
			return { kind: 'officialDaily', attemptKind: 'official' };
	}
}

function firstParam(value: string | readonly string[] | undefined): string | undefined {
	return typeof value === 'string' ? value : value?.[0];
}
