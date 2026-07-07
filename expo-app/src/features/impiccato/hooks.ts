import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Platform } from 'react-native';

import { loadJSON, saveJSON } from '@/lib/storage';
import {
	guessLetter as applyGuess,
	newRound,
	parseSavedRound,
	type ImpiccatoGameState,
	type ImpiccatoRound,
} from '@/features/impiccato/logic';

const STORAGE_KEY = 'impiccato-state-v1';

/**
 * Hydrate the saved round once on mount. Invalid data is discarded; a finished
 * round restarts fresh but keeps its score ('Continua Sfida' semantics).
 * Until this resolves `round` stays null (the screen renders a loading gate).
 * Functional update so a round the user already started (header restart during
 * the load window) is never clobbered by the late-resolving read.
 */
function useHydratedRound(setRound: Dispatch<SetStateAction<ImpiccatoRound | null>>) {
	useEffect(() => {
		let cancelled = false;
		void loadJSON<unknown>(STORAGE_KEY).then((raw) => {
			if (cancelled) return;
			const saved = parseSavedRound(raw);
			setRound(
				(current) =>
					current ?? (saved ? (saved.gameState === 'playing' ? saved : newRound(saved.score)) : newRound(0)),
			);
		});
		return () => {
			cancelled = true;
		};
	}, [setRound]);
}

/** Persist every round change after hydration. */
function usePersistedRound(round: ImpiccatoRound | null) {
	useEffect(() => {
		if (round) void saveJSON(STORAGE_KEY, round);
	}, [round]);
}

/**
 * One-shot end-of-round presentation: fires confetti immediately on a win and
 * schedules the modal ~500ms later so the board stays visible underneath.
 * The `shownRef` guard means dismissing never re-opens the modal, and the
 * timeout is cleared on cleanup so a new round can't pop a stale modal that
 * would reveal the next answer. Guard resets when play resumes.
 */
function useRoundResult(gameState: ImpiccatoGameState) {
	const [modalVisible, setModalVisible] = useState(false);
	const [confettiBurst, setConfettiBurst] = useState(0);
	const shownRef = useRef(false);

	useEffect(() => {
		if (gameState === 'playing') {
			shownRef.current = false;
			setModalVisible(false);
			return;
		}
		if (shownRef.current) return;
		shownRef.current = true;
		if (gameState === 'won') setConfettiBurst((burst) => burst + 1);
		const timeout = setTimeout(() => setModalVisible(true), 500);
		return () => clearTimeout(timeout);
	}, [gameState]);

	const dismissModal = useCallback(() => setModalVisible(false), []);
	return { modalVisible, dismissModal, confettiBurst };
}

/**
 * Web physical keyboard: forwards plain letter keys (accent-insensitive —
 * `guessLetter` normalizes) and ignores modifier combos. No-op on native.
 */
export function useWebKeyboard(onLetter: (letter: string) => void) {
	useEffect(() => {
		if (Platform.OS !== 'web' || typeof window === 'undefined') return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key.length !== 1) return;
			onLetter(event.key);
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onLetter]);
}

/** Orchestrates the hangman round: state, persistence, and end-of-round UI. */
export function useImpiccatoGame() {
	const [round, setRound] = useState<ImpiccatoRound | null>(null);
	useHydratedRound(setRound);
	usePersistedRound(round);
	const { modalVisible, dismissModal, confettiBurst } = useRoundResult(round?.gameState ?? 'playing');

	const guess = useCallback((letter: string) => {
		setRound((current) => (current ? applyGuess(current, letter) : current));
	}, []);

	/** New random word; keepScore=true is 'Continua Sfida', false resets to 0. */
	const startRound = useCallback((keepScore: boolean) => {
		setRound((current) => newRound(keepScore && current ? current.score : 0));
	}, []);

	return { round, guess, startRound, modalVisible, dismissModal, confettiBurst };
}
