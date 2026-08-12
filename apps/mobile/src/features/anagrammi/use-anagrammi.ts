import { useCallback, useEffect, useReducer, useState, type Dispatch } from 'react';
import { Platform } from 'react-native';

import { useOutcomeEvent } from '@/hooks/use-outcome-event';
import { useDailyTerminalRecorder } from '@/features/daily/use-daily-terminal-recorder';
import { parseDailyAdapterSpec, type DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import { loadJSON, saveJSON } from '@/lib/storage';

import { createAnagrammiChallengeRound, createAnagrammiChallengeState } from './anagrammi-daily';
import {
	anagrammiReducer,
	type AnagrammiState,
	createInitialState,
	guessFromPicked,
	parseSavedProgress,
	pickRound,
	remainingSeconds,
	type AnagrammiAction,
	type RoundStatus,
} from './anagrammi-service';

type ReplaceChallengeAction = { readonly type: 'replace-challenge'; readonly state: AnagrammiState };

const STORAGE_KEY = 'anagrammi:progress:v1';

/**
 * Wall-clock countdown tied to the mounted screen: ticks against `deadline`
 * (a Date.now() timestamp) while `running`, fires `onExpire` once at zero,
 * and clears its interval on cleanup. Never started at module scope.
 */
function useCountdown(deadline: number, running: boolean, onExpire: () => void): number {
	const [timeLeft, setTimeLeft] = useState(() => remainingSeconds(deadline, Date.now()));

	useEffect(() => {
		const refresh = () => setTimeLeft(remainingSeconds(deadline, Date.now()));
		const sync = setTimeout(refresh, 0);
		if (!running) return () => clearTimeout(sync);
		const id = setInterval(() => {
			const left = remainingSeconds(deadline, Date.now());
			setTimeLeft(left);
			if (left <= 0) {
				clearInterval(id);
				onExpire();
			}
		}, 250);
		return () => {
			clearTimeout(sync);
			clearInterval(id);
		};
	}, [deadline, running, onExpire]);

	return timeLeft;
}

/**
 * One-shot round result reveal: when the round ends, fire confetti (on win)
 * and open the modal ~1400ms later so the confetti volley plays out first.
 * Runs once per status transition — dismissing never re-opens it — and the
 * timeout is cleared on cleanup so a new round can't pop a stale modal.
 */
function useResultReveal(status: RoundStatus) {
	const [modalVisible, setModalVisible] = useState(false);
	const confettiBurst = status === 'correct' ? 1 : 0;

	useEffect(() => {
		if (status === 'playing') {
			const timeout = setTimeout(() => setModalVisible(false), 0);
			return () => clearTimeout(timeout);
		}
		const timeout = setTimeout(() => setModalVisible(true), 1400);
		return () => clearTimeout(timeout);
	}, [status]);

	const dismissModal = useCallback(() => setModalVisible(false), []);

	return { modalVisible, confettiBurst, dismissModal };
}

/**
 * Loads persisted totals once on mount; invalid data is discarded. Returns
 * true once hydration finished (the screen gates rendering on it so the
 * saved score never flashes in as 0).
 */
function useHydratedProgress(enabled: boolean, dispatch: Dispatch<AnagrammiAction>): boolean {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		void loadJSON<unknown>(STORAGE_KEY).then((raw) => {
			if (cancelled) return;
			const saved = parseSavedProgress(raw);
			dispatch({
				type: 'hydrate',
				score: saved?.score ?? 0,
				streak: saved?.streak ?? 0,
				now: Date.now(),
			});
			setHydrated(true);
		});
		return () => {
			cancelled = true;
		};
	}, [dispatch, enabled]);

	return hydrated;
}

/** Persists totals whenever they change (only after hydration, to avoid clobbering the save with 0s). */
function useSavedProgress(hydrated: boolean, score: number, streak: number) {
	useEffect(() => {
		if (!hydrated) return;
		void saveJSON(STORAGE_KEY, { score, streak });
	}, [hydrated, score, streak]);
}

/**
 * Web physical-keyboard support: letters append (consuming a matching tile,
 * accent-insensitively), Enter submits, Backspace deletes. Modifier chords
 * are ignored. No-op on native.
 */
function useWebKeyboard(onLetter: (letter: string) => void, onEnter: () => void, onBackspace: () => void) {
	useEffect(() => {
		if (Platform.OS !== 'web' || typeof window === 'undefined') return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key === 'Enter') onEnter();
			else if (event.key === 'Backspace') onBackspace();
			else if (/^\p{L}$/u.test(event.key)) onLetter(event.key.toUpperCase());
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onLetter, onEnter, onBackspace]);
}

export function useAnagrammi(routeSession: DailyGameRouteSession) {
	const [state, dispatch] = useReducer(
		(state: AnagrammiState, action: Parameters<typeof anagrammiReducer>[1] | ReplaceChallengeAction) =>
			action.type === 'replace-challenge' ? action.state : anagrammiReducer(state, action),
		null,
		createInitialState,
	);

	useChallengeAnagrammi(routeSession, dispatch);
	const progressHydrated = useHydratedProgress(routeSession.playMode.kind !== 'challenge', dispatch);
	const hydrated = routeSession.playMode.kind === 'challenge' ? routeSession.challenge !== undefined : progressHydrated;
	useSavedProgress(hydrated && routeSession.playMode.kind !== 'challenge', state.score, state.streak);

	const expire = useCallback(() => dispatch({ type: 'expire' }), []);
	const timeLeft = useCountdown(state.deadline, hydrated && state.status === 'playing', expire);

	const { modalVisible, confettiBurst, dismissModal } = useResultReveal(state.status);
	const dailyTerminal = useDailyTerminalRecorder(routeSession.challenge, state.status === 'correct' ? 'win' : state.status === 'skipped' ? 'skip' : undefined);

	useOutcomeEvent(state.status !== 'playing', 'anagrammi.round_ended', () => ({
		won: state.status === 'correct',
		score: state.score,
		streak: state.streak,
		category: state.round.category,
		wordLength: state.round.targetWord.length,
	}));

	const tapTile = useCallback((index: number) => dispatch({ type: 'tap-tile', index }), []);
	const typeLetter = useCallback((letter: string) => dispatch({ type: 'type-letter', letter }), []);
	const backspace = useCallback(() => dispatch({ type: 'backspace' }), []);
	const submit = useCallback(() => dispatch({ type: 'submit', now: Date.now() }), []);
	const requestHint = useCallback(() => dispatch({ type: 'hint' }), []);
	const skip = useCallback(() => dispatch({ type: 'skip' }), []);
	const next = useCallback(() => {
		dismissModal();
		dispatch({ type: 'next', round: routeSession.challenge === undefined ? pickRound() : createAnagrammiChallengeRound(parseDailyAdapterSpec(routeSession.challenge, 'anagrammi').payload), now: Date.now() });
	}, [dismissModal, routeSession.challenge]);
	const reset = useCallback(() => {
		dismissModal();
		dispatch({ type: 'reset', round: routeSession.challenge === undefined ? pickRound() : createAnagrammiChallengeRound(parseDailyAdapterSpec(routeSession.challenge, 'anagrammi').payload), now: Date.now() });
	}, [dismissModal, routeSession.challenge]);

	useWebKeyboard(typeLetter, submit, backspace);

	return {
		state,
		hydrated,
		timeLeft,
		guess: guessFromPicked(state.round, state.picked),
		modalVisible,
		confettiBurst,
		dailyTerminal,
		dismissModal,
		tapTile,
		backspace,
		submit,
		requestHint,
		skip,
		next,
		reset,
	};
}

function useChallengeAnagrammi(routeSession: DailyGameRouteSession, dispatch: Dispatch<ReplaceChallengeAction>): void {
	const { challenge, attemptStartedAt } = routeSession;
	useEffect(() => {
		// Deadline anchors to the official attempt start so leaving and coming
		// back never refills the clock. No start time means the attempt already
		// ended: keep the terminal state on screen instead of rebuilding.
		if (challenge === undefined || attemptStartedAt === undefined) return;
		dispatch({ type: 'replace-challenge', state: createAnagrammiChallengeState(parseDailyAdapterSpec(challenge, 'anagrammi').payload, Date.parse(attemptStartedAt)) });
	}, [attemptStartedAt, challenge, dispatch]);
}
