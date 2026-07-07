import { useCallback, useEffect, useReducer, useState, type Dispatch } from 'react';
import { Platform } from 'react-native';

import { loadJSON, saveJSON } from '@/lib/storage';

import {
	anagrammiReducer,
	createInitialState,
	guessFromPicked,
	parseSavedProgress,
	pickRound,
	remainingSeconds,
	type AnagrammiAction,
	type RoundStatus,
} from './anagrammi-service';

const STORAGE_KEY = 'anagrammi:progress:v1';

/**
 * Wall-clock countdown tied to the mounted screen: ticks against `deadline`
 * (a Date.now() timestamp) while `running`, fires `onExpire` once at zero,
 * and clears its interval on cleanup. Never started at module scope.
 */
function useCountdown(deadline: number, running: boolean, onExpire: () => void): number {
	const [timeLeft, setTimeLeft] = useState(() => remainingSeconds(deadline, Date.now()));

	// Re-sync during render when the deadline changes (new round), so the old
	// round's frozen value (e.g. "0:00") never paints for a frame before the
	// interval effect runs.
	const [prevDeadline, setPrevDeadline] = useState(deadline);
	if (prevDeadline !== deadline) {
		setPrevDeadline(deadline);
		setTimeLeft(remainingSeconds(deadline, Date.now()));
	}

	useEffect(() => {
		if (!running) return;
		setTimeLeft(remainingSeconds(deadline, Date.now()));
		const id = setInterval(() => {
			const left = remainingSeconds(deadline, Date.now());
			setTimeLeft(left);
			if (left <= 0) {
				clearInterval(id);
				onExpire();
			}
		}, 250);
		return () => clearInterval(id);
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
	const [confettiBurst, setConfettiBurst] = useState(0);

	useEffect(() => {
		if (status === 'playing') {
			setModalVisible(false);
			return;
		}
		if (status === 'correct') setConfettiBurst((burst) => burst + 1);
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
function useHydratedProgress(dispatch: Dispatch<AnagrammiAction>): boolean {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
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
	}, [dispatch]);

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

export function useAnagrammi() {
	const [state, dispatch] = useReducer(anagrammiReducer, null, createInitialState);

	const hydrated = useHydratedProgress(dispatch);
	useSavedProgress(hydrated, state.score, state.streak);

	const expire = useCallback(() => dispatch({ type: 'expire' }), [dispatch]);
	const timeLeft = useCountdown(state.deadline, hydrated && state.status === 'playing', expire);

	const { modalVisible, confettiBurst, dismissModal } = useResultReveal(state.status);

	const tapTile = useCallback((index: number) => dispatch({ type: 'tap-tile', index }), [dispatch]);
	const typeLetter = useCallback((letter: string) => dispatch({ type: 'type-letter', letter }), [dispatch]);
	const backspace = useCallback(() => dispatch({ type: 'backspace' }), [dispatch]);
	const submit = useCallback(() => dispatch({ type: 'submit', now: Date.now() }), [dispatch]);
	const requestHint = useCallback(() => dispatch({ type: 'hint' }), [dispatch]);
	const skip = useCallback(() => dispatch({ type: 'skip' }), [dispatch]);
	const next = useCallback(() => {
		dismissModal();
		dispatch({ type: 'next', round: pickRound(), now: Date.now() });
	}, [dispatch, dismissModal]);
	const reset = useCallback(() => {
		dismissModal();
		dispatch({ type: 'reset', round: pickRound(), now: Date.now() });
	}, [dispatch, dismissModal]);

	useWebKeyboard(typeLetter, submit, backspace);

	return {
		state,
		hydrated,
		timeLeft,
		guess: guessFromPicked(state.round, state.picked),
		modalVisible,
		confettiBurst,
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
