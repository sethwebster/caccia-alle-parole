import { writable } from 'svelte/store';

export type Cell = {
	letter: string;
	row: number;
	col: number;
};

export type GameState = 'setup' | 'playing' | 'finished';

type ParoliereStore = {
	grid: string[][];
	foundWords: Set<string>;
	currentPath: Cell[];
	score: number;
	timeLeft: number;
	gameState: GameState;
	currentWord: string;
};

const GRID_SIZE = 4;
const GAME_DURATION = 180; // 3 minutes

// Italian letter frequency distribution
const ITALIAN_LETTERS = 'AAAAEEEEIIIOOOUUULLLNNNRRRSSSTTTCCDDFGGMPBVZQHJ';

function generateRandomGrid(): string[][] {
	const grid: string[][] = [];
	for (let i = 0; i < GRID_SIZE; i++) {
		grid[i] = [];
		for (let j = 0; j < GRID_SIZE; j++) {
			grid[i][j] = ITALIAN_LETTERS[Math.floor(Math.random() * ITALIAN_LETTERS.length)];
		}
	}
	return grid;
}

function createStore() {
	const { subscribe, set, update } = writable<ParoliereStore>({
		grid: generateRandomGrid(),
		foundWords: new Set(),
		currentPath: [],
		score: 0,
		timeLeft: GAME_DURATION,
		gameState: 'setup',
		currentWord: ''
	});

	let timerInterval: number | null = null;

	return {
		subscribe,

		startGame: () => {
			update(state => ({
				...state,
				grid: generateRandomGrid(),
				foundWords: new Set(),
				currentPath: [],
				score: 0,
				timeLeft: GAME_DURATION,
				gameState: 'playing',
				currentWord: ''
			}));

			// Clear any existing timer
			if (timerInterval) clearInterval(timerInterval);

			// Start countdown
			timerInterval = setInterval(() => {
				update(state => {
					if (state.timeLeft <= 1) {
						if (timerInterval) clearInterval(timerInterval);
						return { ...state, timeLeft: 0, gameState: 'finished' };
					}
					return { ...state, timeLeft: state.timeLeft - 1 };
				});
			}, 1000);
		},

		selectCell: (cell: Cell) => {
			update(state => {
				if (state.gameState !== 'playing') return state;

				const { currentPath } = state;

				// Check if cell is already in path
				const alreadySelected = currentPath.some(c => c.row === cell.row && c.col === cell.col);
				if (alreadySelected) return state;

				// Check if cell is adjacent to last cell in path
				if (currentPath.length > 0) {
					const last = currentPath[currentPath.length - 1];
					const rowDiff = Math.abs(last.row - cell.row);
					const colDiff = Math.abs(last.col - cell.col);

					if (rowDiff > 1 || colDiff > 1) return state; // Not adjacent
				}

				const newPath = [...currentPath, cell];
				const currentWord = newPath.map(c => state.grid[c.row][c.col]).join('');

				return {
					...state,
					currentPath: newPath,
					currentWord
				};
			});
		},

		clearSelection: () => {
			update(state => ({
				...state,
				currentPath: [],
				currentWord: ''
			}));
		},

		submitWord: (isValidWord: (word: string) => boolean) => {
			update(state => {
				if (state.gameState !== 'playing') return state;
				if (state.currentWord.length < 3) {
					return { ...state, currentPath: [], currentWord: '' };
				}

				const word = state.currentWord.toLowerCase();

				// Check if already found
				if (state.foundWords.has(word)) {
					return { ...state, currentPath: [], currentWord: '' };
				}

				// Validate word
				if (!isValidWord(word)) {
					return { ...state, currentPath: [], currentWord: '' };
				}

				// Calculate score (more points for longer words)
				const points = word.length <= 3 ? 1 :
							  word.length === 4 ? 2 :
							  word.length === 5 ? 4 :
							  word.length === 6 ? 6 :
							  word.length >= 7 ? 10 : 1;

				return {
					...state,
					foundWords: new Set([...state.foundWords, word]),
					score: state.score + points,
					currentPath: [],
					currentWord: ''
				};
			});
		},

		endGame: () => {
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
			update(state => ({ ...state, gameState: 'finished' }));
		}
	};
}

export const paroliereStore = createStore();
