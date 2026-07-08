import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, type GestureStateChangeEvent, type GestureUpdateEvent, type PanGestureHandlerEventPayload } from 'react-native-gesture-handler';

import { useOutcomeEvent } from '@/hooks/use-outcome-event';
import { Observe } from 'expo-observe';
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

export type Flash = { kind: 'success' | 'error'; cells: SelectedCell[] };

class GridSelectionSession {
	private start: SelectedCell | null = null;
	private last: SelectedCell | null = null;
	private selection: SelectedCell[] = [];

	constructor(private readonly setSelectedCells: (cells: SelectedCell[]) => void) {}

	begin(cell: SelectedCell): void {
		this.start = cell;
		this.last = cell;
		this.setSelection([cell]);
	}

	update(current: SelectedCell, grid: Cell[][]): void {
		if (!this.start) return;
		if (this.last && this.last.row === current.row && this.last.col === current.col) return;
		this.last = current;
		this.setSelection(getCellsBetween(this.start.row, this.start.col, current.row, current.col, grid));
	}

	finalize(onSelectionEnd: (cells: SelectedCell[]) => void): void {
		if (!this.start) return;
		this.start = null;
		this.last = null;
		const cells = this.selection;
		this.setSelection([]);
		onSelectionEnd(cells);
	}

	private setSelection(cells: SelectedCell[]): void {
		this.selection = cells;
		this.setSelectedCells(cells);
	}
}

/** Loads the saved game once on mount; reports when hydration finished. */
function useHydratedGame(setGame: (game: WordSearchState) => void): boolean {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void loadSavedState().then((saved) => {
			if (cancelled) return;
			if (saved) setGame(saved);
			setHydrated(true);
		});
		return () => {
			cancelled = true;
		};
	}, [setGame]);

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
	const [burst, setBurst] = useState(0);
	const firedRef = useRef(false);

	useEffect(() => {
		if (!isWon) {
			firedRef.current = false;
			return;
		}
		if (!firedRef.current) {
			firedRef.current = true;
			setBurst((b) => b + 1);
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
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		},
		[],
	);

	const triggerFlash = (kind: Flash['kind'], cells: SelectedCell[]) => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		setFlash({ kind, cells });
		timeoutRef.current = setTimeout(
			() => {
				setFlash(null);
				timeoutRef.current = null;
			},
			kind === 'error' ? 500 : 400,
		);
	};

	return { flash, triggerFlash };
}

export function useWordSearchGame() {
	const [game, setGame] = useState<WordSearchState>(createEmptyState);
	const hydrated = useHydratedGame(setGame);
	usePersistedGame(game, hydrated);

	const isActive = game.category != null && game.difficulty != null;
	const isWon = isActive && game.words.length > 0 && game.foundWords.size === game.words.length;

	const { showModal, closeModal, burst } = useWinSequence(isWon);
	const { flash, triggerFlash } = useFlash();

	useOutcomeEvent(isWon, 'caccia.completed', () => ({
		category: game.category ?? '',
		difficulty: game.difficulty ?? '',
		score: game.score,
		words: game.words.length,
	}));

	const start = (category: string, difficulty: Difficulty) => {
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
		setGame(createEmptyState());
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
	const [session] = useState(() => new GridSelectionSession(setSelectedCells));

	const cellAt = useCallback((x: number, y: number): SelectedCell => {
		const size = grid.length;
		const clampIndex = (value: number) => Math.min(size - 1, Math.max(0, value));
		const row = clampIndex(Math.floor(y / cellSize));
		const col = clampIndex(Math.floor(x / cellSize));
		return { row, col, letter: grid[row][col].letter };
	}, [cellSize, grid]);

	const ready = grid.length > 0 && cellSize > 0;
	type PanEvent = GestureStateChangeEvent<PanGestureHandlerEventPayload> | GestureUpdateEvent<PanGestureHandlerEventPayload>;

	const handleBegin = useCallback((event: PanEvent) => {
			if (!ready) return;
			session.begin(cellAt(event.x, event.y));
		}, [cellAt, ready, session]);

	const handleUpdate = useCallback((event: PanEvent) => {
			if (!ready) return;
			session.update(cellAt(event.x, event.y), grid);
		}, [cellAt, grid, ready, session]);

	const handleFinalize = useCallback(() => {
			session.finalize(onSelectionEnd);
		}, [onSelectionEnd, session]);

	const pan = useMemo(
		() => Gesture.Pan()
			.enabled(ready)
			.runOnJS(true)
			.minDistance(0)
			.maxPointers(1)
			.onBegin(handleBegin)
			.onUpdate(handleUpdate)
			.onFinalize(handleFinalize),
		[handleBegin, handleFinalize, handleUpdate, ready],
	);

	return { pan, selectedCells };
}
