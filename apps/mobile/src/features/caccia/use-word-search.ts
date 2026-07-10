import { useEffect, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import { useOutcomeEvent } from '@/hooks/use-outcome-event';
import { Observe } from 'expo-observe';
import { useDailyTerminalRecorder } from '@/features/daily/use-daily-terminal-recorder';
import { parseDailyAdapterSpec, type DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import type { Cell, Difficulty, WordSearchState } from '@/lib/types';
import {
	checkIfWordFound,
	getCellsBetween,
	getWordFromCells,
	type SelectedCell,
} from '@/lib/wordDetection';

import {
	createEmptyState,
	createGame,
	loadSavedState,
	markWordFound,
	saveState,
} from './word-search-service';
import { createDailyChallengeGame } from './word-search-daily';

export type Flash = { kind: 'success' | 'error'; cells: SelectedCell[] };

class SelectionGestureState {
	private start: SelectedCell | null = null;
	private last: SelectedCell | null = null;
	private selection: SelectedCell[] = [];

	begin(cell: SelectedCell): void {
		this.start = cell;
		this.last = cell;
	}

	update(cell: SelectedCell): void {
		this.last = cell;
	}

	clear(): void {
		this.start = null;
		this.last = null;
	}

	setSelection(cells: SelectedCell[]): void {
		this.selection = cells;
	}

	getStart(): SelectedCell | null {
		return this.start;
	}

	getLast(): SelectedCell | null {
		return this.last;
	}

	getSelection(): SelectedCell[] {
		return this.selection;
	}
}

class FlashTimerState {
	private timeout: ReturnType<typeof setTimeout> | null = null;

	clear(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = null;
	}

	schedule(callback: () => void, delayMs: number): void {
		this.clear();
		this.timeout = setTimeout(callback, delayMs);
	}
}

/** Loads the saved game once on mount; reports when hydration finished. */
function useHydratedGame(routeSession: DailyGameRouteSession, setGame: (game: WordSearchState) => void): boolean {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		let cancelled = false;
		if (routeSession.playMode.kind === 'challenge') {
			if (routeSession.challenge !== undefined) {
				const challenge = routeSession.challenge;
				void Promise.resolve().then(() => {
					if (cancelled) return;
					setGame(createDailyChallengeGame(parseDailyAdapterSpec(challenge, 'caccia').payload));
					setHydrated(true);
				});
			}
			return () => {
				cancelled = true;
			};
		}
		void loadSavedState().then((saved) => {
			if (cancelled) return;
			if (saved) setGame(saved);
			setHydrated(true);
		});
		return () => {
			cancelled = true;
		};
	}, [routeSession, setGame]);

	return hydrated;
}

/** Persists the game after every change once hydration completed. */
function usePersistedGame(game: WordSearchState, hydrated: boolean) {
	useEffect(() => {
		if (!hydrated) return;
		void saveState(game);
	}, [game, hydrated]);
}

/**
 * One-shot win sequence: confetti fires immediately, the modal ~1400ms later
 * so the completed board stays visible under the shower. The guard resets
 * when a new round starts, dismissing never re-opens the modal, and the
 * pending timeout is cleared on cleanup so a new round can't pop a stale one.
 */
function useWinSequence(isWon: boolean) {
	const [showModal, setShowModal] = useState(false);
	const burst = isWon ? 1 : 0;

	useEffect(() => {
		if (!isWon) {
			const timeout = setTimeout(() => setShowModal(false), 0);
			return () => clearTimeout(timeout);
		}
		const timeout = setTimeout(() => setShowModal(true), 1400);
		return () => clearTimeout(timeout);
	}, [isWon]);

	const closeModal = () => setShowModal(false);

	return { showModal, closeModal, burst };
}

/** Transient green/red highlight on the last selected run of cells. */
function useFlash() {
	const [flash, setFlash] = useState<Flash | null>(null);
	const [timeoutState] = useState(() => new FlashTimerState());

	useEffect(
		() => () => {
			timeoutState.clear();
		},
		[timeoutState],
	);

	const triggerFlash = (kind: Flash['kind'], cells: SelectedCell[]) => {
		timeoutState.clear();
		setFlash({ kind, cells });
		timeoutState.schedule(() => setFlash(null), kind === 'error' ? 500 : 400);
	};

	return { flash, triggerFlash };
}

export function useWordSearchGame(routeSession: DailyGameRouteSession) {
	const [game, setGame] = useState<WordSearchState>(createEmptyState);
	const [terminalReason, setTerminalReason] = useState<'win' | 'giveUp'>();
	const hydrated = useHydratedGame(routeSession, setGame);
	usePersistedGame(game, hydrated && routeSession.playMode.kind !== 'challenge');

	const isActive = game.category != null && game.difficulty != null;
	const isWon = isActive && game.words.length > 0 && game.foundWords.size === game.words.length;

	const { showModal, closeModal, burst } = useWinSequence(isWon);
	const { flash, triggerFlash } = useFlash();
	useDailyTerminalRecorder(routeSession.challenge, isWon ? 'win' : terminalReason);

	useOutcomeEvent(isWon, 'caccia.completed', () => ({
		category: game.category ?? '',
		difficulty: game.difficulty ?? '',
		score: game.score,
		words: game.words.length,
	}));

	const start = (category: string, difficulty: Difficulty) => {
		setTerminalReason(undefined);
		const next = createGame(category, difficulty);
		if (next) {
			Observe.logEvent('caccia.started', { attributes: { category, difficulty } });
			setGame(next);
		}
	};

	/** New grid with the same category and difficulty. */
	const replay = () => {
		if (game.category == null || game.difficulty == null) return;
		closeModal();
		start(game.category, game.difficulty);
	};

	/** Back to the setup screen. */
	const reset = () => {
		if (isActive && !isWon) {
			if (routeSession.playMode.kind === 'challenge') setTerminalReason('giveUp');
			Observe.logEvent('caccia.abandoned', {
				attributes: {
					category: game.category ?? '',
					difficulty: game.difficulty ?? '',
					found: game.foundWords.size,
					words: game.words.length,
				},
			});
		}
		closeModal();
		setGame(routeSession.challenge === undefined ? createEmptyState() : createDailyChallengeGame(parseDailyAdapterSpec(routeSession.challenge, 'caccia').payload));
	};

	const submitSelection = (cells: SelectedCell[]) => {
		if (cells.length < 2) return;
		const word = getWordFromCells(cells);
		const match = checkIfWordFound(word, game.words);
		if (match) {
			setGame((state) => markWordFound(state, match.word));
			triggerFlash('success', cells);
		} else {
			triggerFlash('error', cells);
		}
	};

	return {
		game,
		hydrated,
		isActive,
		isWon,
		showModal,
		closeModal,
		burst,
		flash,
		start,
		replay,
		reset,
		submitSelection,
	};
}

/**
 * One pan gesture over the whole grid: converts gesture x/y to row/col via
 * `cellSize`, tracks the straight run between the start and current cell,
 * and reports the final run when the finger lifts.
 */
export function useGridSelection(
	grid: Cell[][],
	cellSize: number,
	onSelectionEnd: (cells: SelectedCell[]) => void,
) {
	const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
	// Last cell the pointer was over: move events fire per frame, so only
	// recompute the selection when the pointer enters a different cell.
	const [gestureState] = useState(() => new SelectionGestureState());

	const setSelection = (cells: SelectedCell[]) => {
		gestureState.setSelection(cells);
		setSelectedCells(cells);
	};

	const cellAt = (x: number, y: number): SelectedCell => {
		const size = grid.length;
		const clampIndex = (value: number) => Math.min(size - 1, Math.max(0, value));
		const row = clampIndex(Math.floor(y / cellSize));
		const col = clampIndex(Math.floor(x / cellSize));
		return { row, col, letter: grid[row][col].letter };
	};

	const ready = grid.length > 0 && cellSize > 0;

	const pan = Gesture.Pan()
		.enabled(ready)
		.runOnJS(true)
		.minDistance(0)
		.maxPointers(1)
		.onBegin((event) => {
			if (!ready) return;
			const cell = cellAt(event.x, event.y);
			gestureState.begin(cell);
			setSelection([cell]);
		})
		.onUpdate((event) => {
			const start = gestureState.getStart();
			if (!start || !ready) return;
			const current = cellAt(event.x, event.y);
			const last = gestureState.getLast();
			if (last && last.row === current.row && last.col === current.col) return;
			gestureState.update(current);
			setSelection(getCellsBetween(start.row, start.col, current.row, current.col, grid));
		})
		.onFinalize(() => {
			if (!gestureState.getStart()) return;
			gestureState.clear();
			const cells = gestureState.getSelection();
			setSelection([]);
			onSelectionEnd(cells);
		});

	return { pan, selectedCells };
}
