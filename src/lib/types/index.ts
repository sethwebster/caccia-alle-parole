export interface Word {
	word: string;
	translation: string;
	definition: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
	gridSize: number;
	wordCount: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
	easy: { gridSize: 10, wordCount: 10 },
	medium: { gridSize: 14, wordCount: 15 },
	hard: { gridSize: 18, wordCount: 20 }
};

export type Direction =
	| 'horizontal'
	| 'vertical'
	| 'diagonal-down'
	| 'diagonal-up'
	| 'horizontal-reverse'
	| 'vertical-reverse'
	| 'diagonal-down-reverse'
	| 'diagonal-up-reverse';

export interface PlacedWord extends Word {
	row: number;
	col: number;
	direction: Direction;
	points: number;
}

export interface Cell {
	letter: string;
	row: number;
	col: number;
	placed: boolean;
}

export interface WordSearchState {
	category: string | null;
	difficulty: Difficulty | null;
	words: PlacedWord[];
	foundWords: Set<string>;
	score: number;
	grid: Cell[][];
}

export interface WordleGuess {
	word: string;
	result: LetterResult[];
}

export interface LetterResult {
	letter: string;
	status: 'correct' | 'present' | 'absent';
}

export type GameState = 'playing' | 'won' | 'lost';

export type KeyboardState = Record<string, 'correct' | 'present' | 'absent' | 'empty'>;

export interface WordleState {
	targetWord: string;
	targetWordData: Word;
	guesses: WordleGuess[];
	currentGuess: string;
	gameState: GameState;
	keyboardState: KeyboardState;
	date: string;
}
