import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createDailyChallengeGame } from '@/features/caccia/word-search-daily';

import { makeChallengeId } from './date';
import { CANONICAL_PUZZLE_LABELS, TERMINAL_REASONS, type DailyPuzzleKey } from './types';
import { DailyAdapterValidationError, dailyPuzzleAdapters, type DailyAdapterInput } from './adapters';

const themeQuiz = { prompt: 'Tema?', choices: ['Casa', 'Cibo'], answerIndex: 0 };
const baseContext = {
	challengeId: makeChallengeId('2026-01-26'),
	attemptKind: 'official',
	attemptId: 'attempt-1',
	terminalEventId: 'terminal-1',
} as const;

const validSpecs = {
	parola: {
		key: 'parola',
		label: CANONICAL_PUZZLE_LABELS.parola,
		generatorVersion: 'parola-v1',
		dictionaryVersion: 'it-v1',
		themeQuiz,
		payload: { targetWord: 'PASTA', maxAttempts: 6 },
	},
	caccia: {
		key: 'caccia',
		label: CANONICAL_PUZZLE_LABELS.caccia,
		generatorVersion: 'caccia-v1',
		dictionaryVersion: 'it-v1',
		themeQuiz,
		payload: {
			category: 'mare',
			difficulty: 'easy',
			grid: [['M', 'A'], ['R', 'E']],
			words: [{ word: 'MARE', translation: 'sea', definition: 'Acqua salata', row: 0, col: 0, direction: 'horizontal', points: 40, cells: [{ row: 0, col: 0 }] }],
		},
	},
	paroliere: {
		key: 'paroliere',
		label: CANONICAL_PUZZLE_LABELS.paroliere,
		generatorVersion: 'paroliere-v1',
		dictionaryVersion: 'it-v1',
		themeQuiz,
		payload: { grid: [['M', 'A', 'R', 'E'], ['S', 'O', 'L', 'E'], ['L', 'U', 'N', 'A'], ['V', 'E', 'N', 'T']], durationSeconds: 180 },
	},
	impiccato: {
		key: 'impiccato',
		label: CANONICAL_PUZZLE_LABELS.impiccato,
		generatorVersion: 'impiccato-v1',
		dictionaryVersion: 'it-v1',
		themeQuiz,
		payload: { targetWord: 'SOLE', targetCategory: 'natura', targetTranslation: 'sun', targetDefinition: 'Stella', lives: 6 },
	},
	anagrammi: {
		key: 'anagrammi',
		label: CANONICAL_PUZZLE_LABELS.anagrammi,
		generatorVersion: 'anagrammi-v1',
		dictionaryVersion: 'it-v1',
		themeQuiz,
		payload: { targetWord: 'LUNA', tiles: ['N', 'A', 'L', 'U'], translation: 'moon', definition: 'Satellite', category: 'natura', durationSeconds: 60 },
	},
} satisfies Record<DailyPuzzleKey, DailyAdapterInput>;

describe('daily-adapters canonical payload contracts', () => {
	it('parses every canonical payload into deterministic initial state and progress summary', () => {
		const cases = [
			{ key: 'parola', spec: validSpecs.parola, initialize: () => dailyPuzzleAdapters.parola.initialize(dailyPuzzleAdapters.parola.parseSpec(validSpecs.parola)) },
			{ key: 'caccia', spec: validSpecs.caccia, initialize: () => dailyPuzzleAdapters.caccia.initialize(dailyPuzzleAdapters.caccia.parseSpec(validSpecs.caccia)) },
			{ key: 'paroliere', spec: validSpecs.paroliere, initialize: () => dailyPuzzleAdapters.paroliere.initialize(dailyPuzzleAdapters.paroliere.parseSpec(validSpecs.paroliere)) },
			{ key: 'impiccato', spec: validSpecs.impiccato, initialize: () => dailyPuzzleAdapters.impiccato.initialize(dailyPuzzleAdapters.impiccato.parseSpec(validSpecs.impiccato)) },
			{ key: 'anagrammi', spec: validSpecs.anagrammi, initialize: () => dailyPuzzleAdapters.anagrammi.initialize(dailyPuzzleAdapters.anagrammi.parseSpec(validSpecs.anagrammi)) },
		] as const;

		for (const item of cases) {
			const first = item.initialize();
			const second = item.initialize();

			expect(first).toEqual(second);
			expect(first.summary).toMatchObject({ puzzleKey: item.key, label: CANONICAL_PUZZLE_LABELS[item.key], status: 'notStarted' });
			expect(first.provenance).toEqual({ generatorVersion: item.spec.generatorVersion, dictionaryVersion: item.spec.dictionaryVersion });
		}
	});

	it('preserves non-default Caccia placements from catalog payloads through game creation', () => {
		const spec = {
			...validSpecs.caccia,
			payload: {
				category: 'parole',
				difficulty: 'easy',
				grid: [
					['A', 'A', 'S', 'A'],
					['D', 'A', 'O', 'A'],
					['A', 'I', 'L', 'A'],
					['A', 'A', 'E', 'A'],
				],
				words: [
					{
						word: 'SOLE',
						translation: 'sun',
						definition: 'Stella del giorno',
						row: 0,
						col: 2,
						direction: 'vertical',
						points: 40,
						cells: [
							{ row: 0, col: 2 },
							{ row: 1, col: 2 },
							{ row: 2, col: 2 },
							{ row: 3, col: 2 },
						],
					},
					{
						word: 'DIE',
						translation: 'dice',
						definition: 'Dado in inglese',
						row: 1,
						col: 0,
						direction: 'diagonal-down',
						points: 30,
						cells: [
							{ row: 1, col: 0 },
							{ row: 2, col: 1 },
							{ row: 3, col: 2 },
						],
					},
				],
			},
		} satisfies DailyAdapterInput;

		const parsed = dailyPuzzleAdapters.caccia.parseSpec(spec);
		const game = createDailyChallengeGame(parsed.payload);

		expect(game.words).toEqual(spec.payload.words);
		expect(game.grid[0]?.[2]?.placed).toBe(true);
		expect(game.grid[1]?.[0]?.placed).toBe(true);
	});

	it('rejects malformed puzzle specs for each game', () => {
		expect(() => dailyPuzzleAdapters.parola.parseSpec({ ...validSpecs.parola, payload: { targetWord: '', maxAttempts: 6 } })).toThrow('parola');
		expect(() => dailyPuzzleAdapters.parola.parseSpec({ ...validSpecs.parola, payload: { targetWord: 'MARE', maxAttempts: 6 } })).toThrow('targetWord');
		expect(() => dailyPuzzleAdapters.caccia.parseSpec({ ...validSpecs.caccia, payload: { ...validSpecs.caccia.payload, words: [] } })).toThrow('caccia');
		expect(() => dailyPuzzleAdapters.caccia.parseSpec({ ...validSpecs.caccia, payload: { ...validSpecs.caccia.payload, words: [{ ...validSpecs.caccia.payload.words[0], direction: 'sideways' }] } })).toThrow(DailyAdapterValidationError);
		expect(() => dailyPuzzleAdapters.paroliere.parseSpec({ ...validSpecs.paroliere, payload: { grid: [['A']], durationSeconds: 180 } })).toThrow('paroliere');
		expect(() => dailyPuzzleAdapters.impiccato.parseSpec({ ...validSpecs.impiccato, label: 'Impiccato' })).toThrow('impiccato');
		expect(() => dailyPuzzleAdapters.anagrammi.parseSpec({ ...validSpecs.anagrammi, payload: { ...validSpecs.anagrammi.payload, tiles: ['L', 'U', 'N', 'E'] } })).toThrow('anagrammi');
	});
});

describe('daily-adapters terminal context contract', () => {
	it('accepts every terminal reason for every canonical adapter', () => {
		for (const key of ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const) {
			for (const reason of TERMINAL_REASONS) {
				expect(dailyPuzzleAdapters[key].handleTerminal(reason, { ...baseContext, puzzleKey: key })).toEqual({
					puzzleKey: key,
					reason,
					context: { ...baseContext, puzzleKey: key },
				});
			}
		}
	});

	it('rejects missing and lying terminal callback context per game', () => {
		for (const key of ['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi'] as const) {
			const wrongKey = key === 'parola' ? 'caccia' : 'parola';

			expect(() => dailyPuzzleAdapters[key].handleTerminal('win', { ...baseContext, puzzleKey: key, attemptId: '' })).toThrow('attemptId');
			expect(() => dailyPuzzleAdapters[key].handleTerminal('loss', { ...baseContext, puzzleKey: wrongKey })).toThrow('puzzleKey');
			expect(() => dailyPuzzleAdapters[key].handleTerminal('timeout', { ...baseContext, puzzleKey: key })).toThrow('terminal reason');
		}
	});
});

describe('daily-adapters challenge initialization source', () => {
	it('does not call Math.random from challenge adapter initializers', () => {
		const source = readFileSync(new URL('./adapters.ts', import.meta.url), 'utf8');

		expect(source).not.toContain('Math.random');
	});
});
