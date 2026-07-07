import { wordDatabase } from '@/data/word-data';

export const MAX_LIVES = 6;

export const KEYBOARD_LAYOUT: readonly (readonly string[])[] = [
	['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
	['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
	['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export type ImpiccatoGameState = 'playing' | 'won' | 'lost';

export type ImpiccatoRound = {
	targetWord: string;
	targetCategory: string;
	targetTranslation: string;
	targetDefinition: string;
	guessedLetters: string[];
	remainingLives: number;
	gameState: ImpiccatoGameState;
	score: number;
};

/**
 * Accent-insensitive base form: 'À' -> 'A'. The keyboard only offers A-Z,
 * so letter comparisons must ignore accents or accented words are unwinnable.
 */
export function baseLetter(char: string): string {
	return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getRandomWord() {
	const categories = Object.keys(wordDatabase) as (keyof typeof wordDatabase)[];
	const category = categories[Math.floor(Math.random() * categories.length)];
	const words = wordDatabase[category];
	const wordObj = words[Math.floor(Math.random() * words.length)];
	return {
		word: wordObj.word.toUpperCase(),
		category: category as string,
		translation: wordObj.translation,
		definition: wordObj.definition,
	};
}

/** Fresh round with a random word; `score` carries over on 'Continua Sfida'. */
export function newRound(score: number): ImpiccatoRound {
	const next = getRandomWord();
	return {
		targetWord: next.word,
		targetCategory: next.category,
		targetTranslation: next.translation,
		targetDefinition: next.definition,
		guessedLetters: [],
		remainingLives: MAX_LIVES,
		gameState: 'playing',
		score,
	};
}

/**
 * Apply a guess. Input is normalized to its base A-Z form (accent-insensitive);
 * anything else — repeats, non-letters, guesses after the round ended — is a no-op.
 * Win when every base A-Z letter is guessed (spaces/apostrophes are free);
 * score += word.length * 10 + lives * 5 on win. Loss at 0 lives.
 */
export function guessLetter(state: ImpiccatoRound, letter: string): ImpiccatoRound {
	if (state.gameState !== 'playing') return state;
	const upper = baseLetter(letter.toUpperCase());
	if (!/^[A-Z]$/.test(upper)) return state;
	if (state.guessedLetters.includes(upper)) return state;

	const guessedLetters = [...state.guessedLetters, upper];
	const targetLetters = state.targetWord.split('').map(baseLetter);
	const isCorrect = targetLetters.includes(upper);
	const remainingLives = isCorrect ? state.remainingLives : state.remainingLives - 1;
	const allLettersGuessed = targetLetters.every((l) => !/[A-Z]/.test(l) || guessedLetters.includes(l));

	let gameState: ImpiccatoGameState = 'playing';
	let score = state.score;
	if (allLettersGuessed) {
		gameState = 'won';
		score += state.targetWord.length * 10 + remainingLives * 5;
	} else if (remainingLives <= 0) {
		gameState = 'lost';
	}

	return { ...state, guessedLetters, remainingLives, gameState, score };
}

/** Does the target word contain this base A-Z letter (accent-insensitive)? */
export function targetHasLetter(state: ImpiccatoRound, letter: string): boolean {
	return state.targetWord.split('').some((l) => baseLetter(l) === letter);
}

export type LetterSlot = {
	char: string;
	/** gap = space; symbol = free non-letter (apostrophe...); hidden/revealed = guessable A-Z. */
	kind: 'gap' | 'symbol' | 'hidden' | 'revealed';
};

export function getDisplaySlots(state: ImpiccatoRound): LetterSlot[] {
	return state.targetWord.split('').map((char) => {
		if (char === ' ') return { char, kind: 'gap' as const };
		const base = baseLetter(char);
		if (!/^[A-Z]$/.test(base)) return { char, kind: 'symbol' as const };
		return { char, kind: state.guessedLetters.includes(base) ? ('revealed' as const) : ('hidden' as const) };
	});
}

/**
 * Validate hydrated storage data. Wrong shape, duplicate guesses, or an
 * unwinnable combination (non-uppercase word, 'playing' with 0 lives) => null.
 */
export function parseSavedRound(value: unknown): ImpiccatoRound | null {
	if (typeof value !== 'object' || value === null) return null;
	const v = value as Record<string, unknown>;
	const validGuesses =
		Array.isArray(v.guessedLetters) &&
		v.guessedLetters.every((l): l is string => typeof l === 'string' && /^[A-Z]$/.test(l)) &&
		new Set(v.guessedLetters).size === v.guessedLetters.length;
	if (
		typeof v.targetWord !== 'string' ||
		v.targetWord.length === 0 ||
		v.targetWord !== v.targetWord.toUpperCase() ||
		typeof v.targetCategory !== 'string' ||
		typeof v.targetTranslation !== 'string' ||
		typeof v.targetDefinition !== 'string' ||
		!validGuesses ||
		typeof v.remainingLives !== 'number' ||
		!Number.isInteger(v.remainingLives) ||
		v.remainingLives < 0 ||
		v.remainingLives > MAX_LIVES ||
		(v.gameState !== 'playing' && v.gameState !== 'won' && v.gameState !== 'lost') ||
		typeof v.score !== 'number' ||
		!Number.isFinite(v.score) ||
		v.score < 0
	) {
		return null;
	}
	if (v.gameState === 'playing' && v.remainingLives === 0) return null;
	return {
		targetWord: v.targetWord,
		targetCategory: v.targetCategory,
		targetTranslation: v.targetTranslation,
		targetDefinition: v.targetDefinition,
		guessedLetters: v.guessedLetters as string[],
		remainingLives: v.remainingLives,
		gameState: v.gameState,
		score: v.score,
	};
}
