import { Observe } from 'expo-observe';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';

import { loadDailyStatsSummary } from '@/features/daily/progress';
import { useDailyTerminalRecorder } from '@/features/daily/use-daily-terminal-recorder';
import type { DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import type { GameState, WordleState } from '@/lib/types';
import { updateParolaWidget } from '@/lib/widget-bridge';

import { stateFromPuzzle } from './parola-daily';
import {
	buildShareText,
	createTodayState,
	getPuzzleNumber,
	loadSavedState,
	persistState,
	submitCurrentGuess,
	withLetter,
	withoutLastLetter,
} from './parola-logic';

const MODAL_DELAY_MS = 1500;
const TOAST_MS = 1200;
const COPIED_MS = 1500;

export type ParolaToast = { id: number; message: string };

/** Auto-hiding validation banner (~1.2s); timer cleared on unmount. */
function useToast() {
	const [toast, setToast] = useState<ParolaToast | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const idRef = useRef(0);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	const show = useCallback((message: string) => {
		idRef.current += 1;
		setToast({ id: idRef.current, message });
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setToast(null), TOAST_MS);
	}, []);

	return { toast, show };
}

/** 'Copiato!' feedback flag after a web clipboard share; auto-resets. */
function useCopiedFlag(): [boolean, () => void] {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	const flash = useCallback(() => {
		setCopied(true);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
	}, []);

	return [copied, flash];
}

function useHydratedParola(
	routeSession: DailyGameRouteSession,
	setState: (state: WordleState) => void,
	setStreak: (streak: number) => void,
	setHydrated: (hydrated: boolean) => void,
) {
	useEffect(() => {
		let cancelled = false;
		(async () => {
				if (routeSession.playMode.kind === 'challenge') {
					if (routeSession.challenge === undefined) return;
					const dailyStats = await loadDailyStatsSummary();
					if (cancelled) return;
					setState(stateFromPuzzle(routeSession.challenge.context.challengeId, routeSession.challenge.puzzle));
					setStreak(dailyStats.currentStreak);
					setHydrated(true);
					return;
				}
				const [saved, dailyStats] = await Promise.all([loadSavedState(), loadDailyStatsSummary()]);
				if (cancelled) return;
				if (saved) setState(saved);
				const streak = dailyStats.currentStreak;
				setStreak(streak);
			setHydrated(true);
			const state = saved ?? createTodayState();
			updateParolaWidget({
				gameState: state.gameState,
				guessCount: state.guesses.length,
				puzzleNumber: getPuzzleNumber(),
				streak,
			});
		})();
		return () => {
			cancelled = true;
		};
	}, [routeSession, setState, setStreak, setHydrated]);
}

/**
 * One-shot end-of-round reveal: confetti immediately on win, result modal
 * after 1.5s (board stays visible under the confetti). The timeout is cleared
 * on cleanup so a new round can never pop a stale modal, and the guard resets
 * when the game returns to 'playing'. Dismissing the modal never re-opens it.
 */
function useResultReveal(gameState: GameState, onWin: () => void, onShowModal: () => void) {
	const shownRef = useRef(false);
	useEffect(() => {
		if (gameState === 'playing') {
			shownRef.current = false;
			return;
		}
		if (shownRef.current) return;
		shownRef.current = true;
		if (gameState === 'won') onWin();
		const t = setTimeout(onShowModal, MODAL_DELAY_MS);
		return () => clearTimeout(t);
	}, [gameState, onWin, onShowModal]);
}

/** Physical keyboard on web: Enter submits, Backspace deletes, letters minus J/K/W/X/Y. */
function useWebKeyboard(onKey: (key: string) => void) {
	useEffect(() => {
		if (Platform.OS !== 'web' || typeof window === 'undefined') return;
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === 'Enter') {
				// Prevent a focused on-screen key from also activating.
				e.preventDefault();
				onKey('ENTER');
			} else if (e.key === 'Backspace') {
				onKey('⌫');
			} else if (/^[a-zA-Z]$/.test(e.key) && !/^[wWxXyYjJkK]$/.test(e.key)) {
				onKey(e.key.toUpperCase());
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	}, [onKey]);
}

export function useParolaGame(routeSession: DailyGameRouteSession) {
	const [state, setState] = useState<WordleState>(createTodayState);
	const [hydrated, setHydrated] = useState(false);
	const [streak, setStreak] = useState(0);
	const [modalVisible, setModalVisible] = useState(false);
	const [burst, setBurst] = useState(0);
	const { toast, show: showToast } = useToast();
	const [copied, flashCopied] = useCopiedFlag();

	useHydratedParola(routeSession, setState, setStreak, setHydrated);

	const fireConfetti = useCallback(() => setBurst((b) => b + 1), []);
	const showModal = useCallback(() => setModalVisible(true), []);
	useResultReveal(state.gameState, fireConfetti, showModal);
	const dailyTerminal = useDailyTerminalRecorder(routeSession.challenge, state.gameState === 'won' ? 'win' : state.gameState === 'lost' ? 'loss' : undefined);

	const syncSubmittedGuess = useCallback(
		(next: WordleState) => {
			if (routeSession.playMode.kind !== 'challenge') void persistState(next);
			if (next.gameState !== 'playing') {
				Observe.logEvent('parola.finished', {
					attributes: {
						won: next.gameState === 'won',
						attempts: next.guesses.length,
						dailyChallengeStreak: streak,
						puzzle: getPuzzleNumber(),
					},
				});
			}
			updateParolaWidget({
				gameState: next.gameState,
				guessCount: next.guesses.length,
				puzzleNumber: getPuzzleNumber(),
				streak,
			});
		},
		[routeSession.playMode.kind, streak],
	);

	const onKey = useCallback(
		(key: string) => {
			// The web keydown listener is live before hydration; input applied to the
			// placeholder state would be clobbered when the saved game arrives.
			if (!hydrated) return;
			if (key === 'ENTER') {
				const outcome = submitCurrentGuess(state);
				if (outcome.kind === 'rejected') showToast(outcome.message);
				if (outcome.kind !== 'played') return;
				setState(outcome.state);
				void syncSubmittedGuess(outcome.state);
			} else if (key === '⌫') {
				setState(withoutLastLetter);
			} else {
				setState((s) => withLetter(s, key));
			}
		},
		[hydrated, state, showToast, syncSubmittedGuess],
	);

	useWebKeyboard(onKey);

	const share = useCallback(async () => {
		const text = buildShareText(state);
		Observe.logEvent('parola.shared', {
			attributes: { won: state.gameState === 'won', attempts: state.guesses.length },
		});
		if (Platform.OS === 'web') {
			if (!navigator.clipboard) return;
			try {
				await navigator.clipboard.writeText(text);
				flashCopied();
			} catch {
				// clipboard blocked (permissions / insecure context)
			}
		} else {
			try {
				await Share.share({ message: text });
			} catch {
				// share sheet dismissed
			}
		}
	}, [state, flashCopied]);

	const dismissModal = useCallback(() => setModalVisible(false), []);

	return {
		state,
		hydrated,
		streak,
		toast,
		copied,
		modalVisible,
		burst,
		dailyTerminal,
		puzzleNumber: getPuzzleNumber(),
		onKey,
		share,
		dismissModal,
	};
}
