import { useEffect, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';

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
 * One-shot win sequence: confetti fires immediately, the modal ~500ms later
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
		const timeout = setTimeout(() => setShowModal(true), 500);
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

	const start = (category: string, difficulty: Difficulty) => {
		const next = createGame(category, difficulty);
		if (next) setGame(next);
	};

	/** New grid with the same category and difficulty. */
	const replay = () => {
		if (game.category == null || game.difficulty == null) return;
		closeModal();
		start(game.category, game.difficulty);
	};

	/** Back to the setup screen. */
	const reset = () => {
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
	const startRef = useRef<SelectedCell | null>(null);
	// Last cell the pointer was over: move events fire per frame, so only
	// recompute the selection when the pointer enters a different cell.
	const lastCellRef = useRef<SelectedCell | null>(null);
	// Mirrors `selectedCells` so gesture callbacks read the live selection
	// instead of a render-time snapshot.
	const selectionRef = useRef<SelectedCell[]>([]);

	const setSelection = (cells: SelectedCell[]) => {
		selectionRef.current = cells;
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
			startRef.current = cell;
			lastCellRef.current = cell;
			setSelection([cell]);
		})
		.onUpdate((event) => {
			const start = startRef.current;
			if (!start || !ready) return;
			const current = cellAt(event.x, event.y);
			const last = lastCellRef.current;
			if (last && last.row === current.row && last.col === current.col) return;
			lastCellRef.current = current;
			setSelection(getCellsBetween(start.row, start.col, current.row, current.col, grid));
		})
		.onFinalize(() => {
			if (!startRef.current) return;
			startRef.current = null;
			lastCellRef.current = null;
			const cells = selectionRef.current;
			setSelection([]);
			onSelectionEnd(cells);
		});

	return { pan, selectedCells };
}
