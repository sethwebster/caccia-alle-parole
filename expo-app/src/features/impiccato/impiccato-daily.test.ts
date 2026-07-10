import { describe, expect, it } from 'vitest';

import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId } from '@/features/daily/date';
import { DailyProgressMutationQueue, createDailyProgressStore } from '@/features/daily/progress';
import type { ChallengeId, ChallengeSource, TerminalReason } from '@/features/daily/types';

import {
	buildDailyImpiccatoTerminalResult,
	initializeDailyImpiccatoRound,
	summarizeDailyImpiccatoRound,
} from './daily';
import { getDisplaySlots, guessLetter, newRound } from './logic';

class MemoryProgressStorage {
	readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}

const challengeId = makeChallengeId('2026-01-26');
const source: ChallengeSource = {
	kind: 'bundledCatalog',
	epoch: makeCatalogEpoch('daily-v1'),
	version: makeCatalogVersion('2026.01'),
};

const validSpec = {
	key: 'impiccato',
	label: 'Il Palloncino',
	generatorVersion: 'impiccato-v1',
	dictionaryVersion: 'it-v1',
	themeQuiz: { prompt: 'Tema?', choices: ['Natura', 'Cibo'], answerIndex: 0 },
	payload: {
		targetWord: 'SOLE',
		targetCategory: 'natura',
		targetTranslation: 'sun',
		targetDefinition: 'Stella del giorno',
		lives: 6,
	},
} as const;

function terminalInput(input: {
	readonly attemptKind: 'official' | 'replay';
	readonly attemptId: string;
	readonly terminalEventId: string;
	readonly reason: TerminalReason;
	readonly completedAt?: Date;
	readonly challengeId?: ChallengeId;
}) {
	return {
		challengeId: input.challengeId ?? challengeId,
		puzzleKey: 'impiccato' as const,
		attemptKind: input.attemptKind,
		attemptId: input.attemptId,
		terminalEventId: input.terminalEventId,
		reason: input.reason,
		completedAt: input.completedAt ?? new Date('2026-01-26T12:00:00Z'),
		source,
	};
}

async function expectOk<T>(result: Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }>): Promise<T> {
	const settled = await result;
	expect(settled.ok).toBe(true);
	if (!settled.ok) throw new Error('expected ok result');
	return settled.value;
}

describe('impiccato daily challenge adapter', () => {
	it('initializes the exact canonical payload target and display slots', () => {
		const { initialization, round } = initializeDailyImpiccatoRound(validSpec);

		expect(initialization.summary).toEqual({
			puzzleKey: 'impiccato',
			label: 'Il Palloncino',
			status: 'notStarted',
			score: 0,
			completedUnits: 0,
			totalUnits: 4,
			generatorVersion: 'impiccato-v1',
			dictionaryVersion: 'it-v1',
		});
		expect(round).toEqual({
			targetWord: 'SOLE',
			targetCategory: 'natura',
			targetTranslation: 'sun',
			targetDefinition: 'Stella del giorno',
			guessedLetters: [],
			remainingLives: 6,
			gameState: 'playing',
			score: 0,
		});
		expect(getDisplaySlots(round)).toEqual([
			{ char: 'S', kind: 'hidden' },
			{ char: 'O', kind: 'hidden' },
			{ char: 'L', kind: 'hidden' },
			{ char: 'E', kind: 'hidden' },
		]);
	});

	it('rejects empty and non-uppercase challenge targets', () => {
		expect(() => initializeDailyImpiccatoRound({ ...validSpec, payload: { ...validSpec.payload, targetWord: '' } })).toThrow('targetWord');
		expect(() => initializeDailyImpiccatoRound({ ...validSpec, payload: { ...validSpec.payload, targetWord: 'Sole' } })).toThrow('targetWord');
	});

	it('scores identical guesses across official and replay summaries while keeping summary kinds separate', () => {
		const { round } = initializeDailyImpiccatoRound(validSpec);
		const officialWon = ['S', 'O', 'L', 'E'].reduce(guessLetter, round);
		const replayWon = ['S', 'O', 'L', 'E'].reduce(guessLetter, round);

		expect(summarizeDailyImpiccatoRound(officialWon, 'official')).toEqual({
			puzzleKey: 'impiccato',
			label: 'Il Palloncino',
			attemptKind: 'official',
			status: 'won',
			reason: 'win',
			score: 70,
			completedUnits: 4,
			totalUnits: 4,
			wrongGuesses: 0,
			remainingLives: 6,
		});
		expect(summarizeDailyImpiccatoRound(replayWon, 'replay')).toEqual({
			puzzleKey: 'impiccato',
			label: 'Il Palloncino',
			attemptKind: 'replay',
			status: 'won',
			reason: 'win',
			score: 70,
			completedUnits: 4,
			totalUnits: 4,
			wrongGuesses: 0,
			remainingLives: 6,
		});
	});

	it('persists loss and give-up terminal reasons through daily progress', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));

		await expectOk(queue.recordPuzzleTerminal(terminalInput({ attemptKind: 'official', attemptId: 'official-loss', terminalEventId: 'loss-event', reason: 'loss' })));
		await expectOk(queue.recordPuzzleTerminal(terminalInput({ attemptKind: 'replay', attemptId: 'replay-give-up', terminalEventId: 'give-up-event', reason: 'giveUp' })));

		const loaded = await expectOk(createDailyProgressStore(storage).load());
		const record = loaded.kind === 'ready' ? loaded.progress.challenges[0] : undefined;
		expect(record?.officialAttempt?.terminalEvents).toEqual([
			{ attemptId: 'official-loss', completedAt: '2026-01-26T12:00:00.000Z', puzzleKey: 'impiccato', reason: 'loss', terminalEventId: 'loss-event' },
		]);
		expect(record?.replayAttempts).toEqual([
			{
				attemptId: 'replay-give-up',
				terminalEvents: [{ attemptId: 'replay-give-up', completedAt: '2026-01-26T12:00:00.000Z', puzzleKey: 'impiccato', reason: 'giveUp', terminalEventId: 'give-up-event' }],
			},
		]);
	});

	it('keeps replay terminal records from overwriting the official result', async () => {
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));

		await expectOk(queue.recordPuzzleTerminal(terminalInput({ attemptKind: 'official', attemptId: 'official-win', terminalEventId: 'official-win-event', reason: 'win' })));
		await expectOk(queue.recordPuzzleTerminal(terminalInput({ attemptKind: 'replay', attemptId: 'replay-loss', terminalEventId: 'replay-loss-event', reason: 'loss' })));

		const loaded = await expectOk(createDailyProgressStore(storage).load());
		const record = loaded.kind === 'ready' ? loaded.progress.challenges[0] : undefined;
		expect(record?.officialAttempt).toEqual({
			attemptId: 'official-win',
			terminalEvents: [{ attemptId: 'official-win', completedAt: '2026-01-26T12:00:00.000Z', puzzleKey: 'impiccato', reason: 'win', terminalEventId: 'official-win-event' }],
		});
		expect(record?.replayAttempts[0]?.terminalEvents[0]?.reason).toBe('loss');
	});

	it('builds terminal results with full context and preserves standalone random rounds', () => {
		expect(
			buildDailyImpiccatoTerminalResult('giveUp', {
				challengeId,
				puzzleKey: 'impiccato',
				attemptKind: 'official',
				attemptId: 'official-give-up',
				terminalEventId: 'give-up-terminal',
			}),
		).toEqual({
			puzzleKey: 'impiccato',
			reason: 'giveUp',
			context: { challengeId, puzzleKey: 'impiccato', attemptKind: 'official', attemptId: 'official-give-up', terminalEventId: 'give-up-terminal' },
		});

		const practiceRound = newRound(15);
		expect(practiceRound.score).toBe(15);
		expect(practiceRound.gameState).toBe('playing');
		expect(practiceRound.targetWord.length).toBeGreaterThan(0);
	});
});
