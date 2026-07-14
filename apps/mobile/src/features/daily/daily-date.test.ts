import { describe, expect, it } from 'vitest';

import {
	buildTerminalAttemptContext,
	evaluateOfficialStreakEligibility,
	isCompleteTerminalAttemptContext,
	isTerminalReason,
} from './contract';
import {
	challengeIdForDate,
	compareStreakDates,
	makeCatalogEpoch,
	makeCatalogVersion,
	makeChallengeId,
	makeLocalCivilDate,
	makeReleaseBaseChallengeId,
	makeSupportedDateRange,
	nextStreakDate,
	streakDateForDate,
} from './date';
import {
	CANONICAL_PUZZLE_LABELS,
	CANONICAL_PUZZLE_KEYS,
} from './types';

describe('daily-date Paròle-style local date contract', () => {
	it('matches Paròle local civil date formatting near local midnight', () => {
		const date = new Date(2026, 0, 26, 23, 59, 59, 999);
		const localDate = '2026-01-26';

		const challengeId = challengeIdForDate(date);
		const streakDate = streakDateForDate(date);

		expect(challengeId).toBe(localDate);
		expect(streakDate).toBe(localDate);
	});

	it('rolls over at local midnight without UTC tomorrow-tonight flips', () => {
		const beforeMidnight = new Date(2026, 5, 1, 23, 30);
		const afterMidnight = new Date(2026, 5, 2, 0, 0);

		expect(challengeIdForDate(beforeMidnight)).toBe('2026-06-01');
		expect(streakDateForDate(afterMidnight)).toBe('2026-06-02');
	});

	it('uses calendar-day comparison across DST instead of 24-hour arithmetic', () => {
		expect(nextStreakDate(streakDateForDate(new Date(2026, 2, 8)))).toBe('2026-03-09');
		expect(compareStreakDates(streakDateForDate(new Date(2026, 2, 8)), streakDateForDate(new Date(2026, 2, 9)))).toBe(
			'consecutive',
		);
	});

	it('rejects malformed or impossible local civil dates', () => {
		expect(() => makeLocalCivilDate('2026-2-08')).toThrow('Invalid local civil date: 2026-2-08');
		expect(() => makeChallengeId('2026-02-30')).toThrow('Invalid local civil date: 2026-02-30');
	});
});

describe('daily-date official streak eligibility', () => {
	it('credits the release-day streak only when completion commits on the same local challenge date', () => {
		const challengeId = challengeIdForDate(new Date(2026, 0, 26, 12));
		const completedAt = new Date(2026, 0, 26, 20);

		const result = evaluateOfficialStreakEligibility({
			challengeId,
			startedAt: new Date(2026, 0, 26, 10),
			completedAt,
			creditedChallengeIds: [],
			creditedStreakDates: [],
		});

		expect(result).toEqual({ kind: 'credit', challengeId, streakDate: streakDateForDate(completedAt) });
	});

	it('archives a prior challenge completed after local midnight without streak credit', () => {
		const challengeId = challengeIdForDate(new Date(2026, 0, 26, 23, 58));
		const completedAt = new Date(2026, 0, 27, 0, 2);

		const result = evaluateOfficialStreakEligibility({
			challengeId,
			startedAt: new Date(2026, 0, 26, 23, 58),
			completedAt,
			creditedChallengeIds: [],
			creditedStreakDates: [],
		});

		expect(result).toEqual({
			kind: 'archiveOnly',
			reason: 'completedAfterReleaseDay',
			challengeId,
			completionStreakDate: streakDateForDate(completedAt),
		});
	});

	it('allows one streak credit per challenge ID', () => {
		const challengeId = challengeIdForDate(new Date(2026, 0, 26));
		const completedAt = new Date(2026, 0, 26, 8);

		const result = evaluateOfficialStreakEligibility({
			challengeId,
			startedAt: new Date(2026, 0, 26, 7),
			completedAt,
			creditedChallengeIds: [challengeId],
			creditedStreakDates: [],
		});

		expect(result).toEqual({ kind: 'archiveOnly', reason: 'challengeAlreadyCredited', challengeId });
	});

	it('prevents timezone travel from double-crediting one streak date', () => {
		const challengeId = challengeIdForDate(new Date(2026, 0, 26, 11));
		const completedAt = new Date(2026, 0, 26, 18);
		const streakDate = streakDateForDate(completedAt);

		const result = evaluateOfficialStreakEligibility({
			challengeId,
			startedAt: new Date(2026, 0, 26, 16),
			completedAt,
			creditedChallengeIds: [],
			creditedStreakDates: [streakDate],
		});

		expect(result).toEqual({ kind: 'archiveOnly', reason: 'streakDateAlreadyCredited', streakDate });
	});
});

describe('daily-date domain contract', () => {
	it('exposes canonical puzzle keys and localized labels separately', () => {
		expect(CANONICAL_PUZZLE_KEYS).toEqual(['parola', 'caccia', 'paroliere', 'impiccato', 'anagrammi']);
		expect(CANONICAL_PUZZLE_LABELS).toEqual({
			parola: 'Paròle',
			caccia: 'Caccia alle Paròle',
			paroliere: 'Paroliere+',
			impiccato: 'Il Palloncino',
			anagrammi: 'Anagrammi+',
		});
	});

	it('accepts only canonical terminal reasons', () => {
		expect(['win', 'loss', 'skip', 'giveUp'].filter(isTerminalReason)).toEqual(['win', 'loss', 'skip', 'giveUp']);
		expect(isTerminalReason('timeout')).toBe(false);
	});

	it('requires complete terminal attempt context fields', () => {
		const context = buildTerminalAttemptContext({
			challengeId: challengeIdForDate(new Date(2026, 0, 26)),
			puzzleKey: 'parola',
			attemptKind: 'official',
			attemptId: 'attempt-1',
			terminalEventId: 'event-1',
		});

		expect(context).toEqual({
			challengeId: '2026-01-26',
			puzzleKey: 'parola',
			attemptKind: 'official',
			attemptId: 'attempt-1',
			terminalEventId: 'event-1',
		});
		expect(isCompleteTerminalAttemptContext(context)).toBe(true);
		expect(isCompleteTerminalAttemptContext({ challengeId: context.challengeId, puzzleKey: context.puzzleKey })).toBe(false);
	});

	it('brands catalog metadata and supported date range', () => {
		const releaseBaseChallengeId = makeReleaseBaseChallengeId('2026-01-26');

		expect(makeCatalogEpoch('daily-v1')).toBe('daily-v1');
		expect(makeCatalogVersion('2026.01')).toBe('2026.01');
		expect(releaseBaseChallengeId).toBe('2026-01-26');
		expect(makeSupportedDateRange({ start: '2026-01-26', endInclusive: '2026-12-31' })).toEqual({
			start: '2026-01-26',
			endInclusive: '2026-12-31',
		});
	});
});
