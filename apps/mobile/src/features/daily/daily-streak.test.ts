import { describe, expect, it, vi } from 'vitest';

import { DAILY_CHALLENGE_REMINDER_CONTENT } from '../notifications/streak-reminder';
import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId, makeStreakDate } from './date';
import { DailyProgressMutationQueue, createDailyProgressStore, loadDailyStatsSummary } from './progress';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type DailyPuzzleKey, type TerminalReason } from './types';

vi.mock('expo-notifications', () => ({
	SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
	cancelScheduledNotificationAsync: vi.fn(),
	scheduleNotificationAsync: vi.fn(),
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

vi.mock('../notifications/push-notifications', () => ({ ensureNotificationPermissionAsync: vi.fn() }));

class MemoryProgressStorage {
	readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}

const source = {
	kind: 'bundledCatalog',
	epoch: makeCatalogEpoch('daily-v1'),
	version: makeCatalogVersion('2026.01'),
} as const;

function terminalInput(input: {
	readonly challengeId: ChallengeId;
	readonly puzzleKey: DailyPuzzleKey;
	readonly terminalEventId: string;
	readonly reason?: TerminalReason;
	readonly attemptKind?: 'official' | 'replay';
	readonly attemptId?: string;
	readonly completedAt?: Date;
}) {
	return {
		challengeId: input.challengeId,
		puzzleKey: input.puzzleKey,
		attemptKind: input.attemptKind ?? 'official',
		attemptId: input.attemptId ?? `attempt:${input.challengeId}`,
		terminalEventId: input.terminalEventId,
		reason: input.reason ?? 'win',
		completedAt: input.completedAt ?? new Date(2026, 0, 26, 12),
		source,
	};
}

async function expectReadyProgress(storage: MemoryProgressStorage) {
	const loaded = await createDailyProgressStore(storage).load();
	expect(loaded.ok).toBe(true);
	if (!loaded.ok || loaded.value.kind !== 'ready') throw new Error('expected ready progress');
	return loaded.value.progress;
}

describe('daily-streak completion credits', () => {
	it('keeps a Paròle-only terminal result out of the Daily Challenge completion streak', async () => {
		// Given
		const storage = new MemoryProgressStorage();
		const store = createDailyProgressStore(storage);
		const queue = new DailyProgressMutationQueue(store);
		const challengeId = makeChallengeId('2026-01-26');

		// When
		await queue.recordPuzzleTerminal(terminalInput({ challengeId, puzzleKey: 'parola', terminalEventId: 'parola-only' }));

		// Then
		const stats = await loadDailyStatsSummary(store);
		expect(stats.currentStreak).toBe(0);
		expect(stats.completedOfficialChallenges).toBe(0);
		expect(stats.allWonOfficialChallenges).toBe(0);
		expect(stats.perfectOfficialChallenges).toBe(0);
	});

	it('creates one release-day credit after all five official puzzles reach terminal states', async () => {
		// Given
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const challengeId = makeChallengeId('2026-01-26');
		const reasons: readonly TerminalReason[] = ['win', 'loss', 'skip', 'giveUp', 'loss'];
		const completedAt = new Date(2026, 0, 26, 18);

		// When
		for (const [index, puzzleKey] of CANONICAL_PUZZLE_KEYS.entries()) {
			await queue.recordPuzzleTerminal(
				terminalInput({ challengeId, puzzleKey, reason: reasons[index] ?? 'loss', terminalEventId: `terminal:${puzzleKey}`, completedAt }),
			);
		}

		// Then
		const progress = await expectReadyProgress(storage);
		expect(progress.credits).toEqual([
			{
				challengeId,
				completedAt: completedAt.toISOString(),
				creditId: 'credit:2026-01-26',
				streakDate: makeStreakDate('2026-01-26'),
			},
		]);
		expect(progress.statsSummary).toMatchObject({
			allWonOfficialChallenges: 0,
			completedOfficialChallenges: 1,
			currentStreak: 1,
			maxStreak: 1,
			perfectOfficialChallenges: 0,
		});
	});

	it('tracks all-won and perfect challenge stats separately from the completion streak', async () => {
		// Given
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const mixedDay = makeChallengeId('2026-01-26');
		const allWonDay = makeChallengeId('2026-01-27');
		const mixedReasons: readonly TerminalReason[] = ['win', 'loss', 'skip', 'giveUp', 'win'];

		// When
		for (const [index, puzzleKey] of CANONICAL_PUZZLE_KEYS.entries()) {
			await queue.recordPuzzleTerminal(
				terminalInput({
					challengeId: mixedDay,
					puzzleKey,
					reason: mixedReasons[index] ?? 'loss',
					terminalEventId: `mixed:${puzzleKey}`,
					completedAt: new Date(2026, 0, 26, 12),
				}),
			);
			await queue.recordPuzzleTerminal(
				terminalInput({
					challengeId: allWonDay,
					puzzleKey,
					reason: 'win',
					terminalEventId: `all-won:${puzzleKey}`,
					completedAt: new Date(2026, 0, 27, 12),
				}),
			);
		}

		// Then
		const stats = await loadDailyStatsSummary(createDailyProgressStore(storage));
		expect(stats).toMatchObject({
			allWonOfficialChallenges: 1,
			completedOfficialChallenges: 2,
			currentStreak: 2,
			maxStreak: 2,
			perfectOfficialChallenges: 1,
		});
	});

	it('archives after-midnight and replay completions without completion streak credit', async () => {
		// Given
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const challengeId = makeChallengeId('2026-01-26');

		// When
		for (const puzzleKey of CANONICAL_PUZZLE_KEYS) {
			await queue.recordPuzzleTerminal(
				terminalInput({
					challengeId,
					puzzleKey,
					terminalEventId: `late:${puzzleKey}`,
					completedAt: new Date(2026, 0, 27, 0, 2),
				}),
			);
			await queue.recordPuzzleTerminal(
				terminalInput({
					challengeId,
					puzzleKey,
					attemptKind: 'replay',
					attemptId: 'replay-1',
					terminalEventId: `replay:${puzzleKey}`,
				}),
			);
		}

		// Then
		const progress = await expectReadyProgress(storage);
		expect(progress.credits).toEqual([]);
		expect(progress.statsSummary.completedOfficialChallenges).toBe(1);
		expect(progress.statsSummary.allWonOfficialChallenges).toBe(1);
		expect(progress.statsSummary.perfectOfficialChallenges).toBe(1);
		expect(progress.challenges[0]?.replayAttempts).toHaveLength(1);
	});

	it('deduplicates terminal events and serializes adjacent-day streak stats through the mutation queue', async () => {
		// Given
		const storage = new MemoryProgressStorage();
		const queue = new DailyProgressMutationQueue(createDailyProgressStore(storage));
		const firstDay = makeChallengeId('2026-01-26');
		const secondDay = makeChallengeId('2026-01-27');

		// When
		await Promise.all(
			[firstDay, secondDay].flatMap((challengeId) =>
				CANONICAL_PUZZLE_KEYS.map((puzzleKey) =>
					queue.recordPuzzleTerminal(
						terminalInput({
							challengeId,
							puzzleKey,
							terminalEventId: `terminal:${challengeId}:${puzzleKey}`,
							completedAt: new Date(`${challengeId}T12:00:00`),
						}),
					),
				),
			),
		);
		await queue.recordPuzzleTerminal(terminalInput({ challengeId: firstDay, puzzleKey: 'parola', terminalEventId: `terminal:${firstDay}:parola` }));

		// Then
		const progress = await expectReadyProgress(storage);
		expect(progress.credits.map((credit) => credit.creditId)).toEqual(['credit:2026-01-26', 'credit:2026-01-27']);
		expect(progress.statsSummary).toMatchObject({ completedOfficialChallenges: 2, currentStreak: 2, maxStreak: 2 });
	});

	it('uses Daily Challenge reminder copy without victory-streak wording', () => {
		// Given
		const copy = `${DAILY_CHALLENGE_REMINDER_CONTENT.title} ${DAILY_CHALLENGE_REMINDER_CONTENT.body}`;

		// When / Then
		expect(DAILY_CHALLENGE_REMINDER_CONTENT.data).toEqual({ url: '/daily' });
		expect(copy).toContain('Sfida Giornaliera');
		expect(copy).not.toContain('Paròle');
		expect(copy.toLowerCase()).not.toContain('vittorie');
	});
});
