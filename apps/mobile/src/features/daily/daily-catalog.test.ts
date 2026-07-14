import { describe, expect, it } from 'vitest';

import snapshots from './__fixtures__/challenge-snapshots.json';
import {
	CATALOG_METADATA,
	SUPPORTED_FORWARD_WINDOW_DAYS,
	generateChallengeSnapshots,
	resolveArchivedChallengeBundle,
	resolveDailyChallengeBundle,
	validateDailyChallengeBundle,
} from './catalog';
import { validateBundledDailyCatalog } from './catalog-validation';
import { challengeIdForDate, makeChallengeId } from './date';
import { CANONICAL_PUZZLE_KEYS } from './types';

describe('daily-catalog deterministic challenge resolution', () => {
	it('matches frozen published and supported-window snapshots', () => {
		expect(generateChallengeSnapshots()).toEqual(snapshots);
	});

	it('validates bundled catalog workflow safeguards', () => {
		expect(validateBundledDailyCatalog(snapshots)).toEqual({ kind: 'valid', checkedSnapshots: 6 });
	});

	it('resolves the same supplied challenge ID identically across repeated runs', () => {
		const challengeId = makeChallengeId('2026-07-09');

		const first = resolveDailyChallengeBundle({ challengeId });
		const second = resolveDailyChallengeBundle({ challengeId });

		expect(first).toEqual(second);
		expect(first.kind).toBe('ready');
	});

	it('uses timezone only to choose the active local date, not content for a supplied ID', () => {
		const suppliedChallengeId = makeChallengeId('2026-02-14');
		const morning = new Date(2026, 1, 14, 8);
		const evening = new Date(2026, 1, 14, 23, 30);

		expect(resolveDailyChallengeBundle({ challengeId: suppliedChallengeId })).toEqual(
			resolveDailyChallengeBundle({ challengeId: suppliedChallengeId, today: morning }),
		);
		expect(challengeIdForDate(evening)).toBe(suppliedChallengeId);
	});

	it('exposes fixed catalog metadata and at least one full future year', () => {
		expect(CATALOG_METADATA).toEqual({
			catalogEpoch: 'daily-v1',
			catalogVersion: '2026.01.26',
			releaseBaseChallengeId: '2026-01-26',
			supportedFromChallengeId: '2026-01-26',
			supportedThroughChallengeId: '2027-01-26',
		});
		expect(SUPPORTED_FORWARD_WINDOW_DAYS).toBe(365);
	});

	it('rejects invalid theme metadata in the bundled workflow', () => {
		const invalid = {
			...snapshots,
			samples: {
				...snapshots.samples,
				'2026-01-26': {
					...snapshots.samples['2026-01-26'],
					theme: { ...snapshots.samples['2026-01-26'].theme, explanation: '' },
				},
			},
		};

		expect(validateBundledDailyCatalog(invalid)).toEqual({
			kind: 'invalid',
			issues: expect.arrayContaining(['samples 2026-01-26: missing theme explanation', 'published/sample or forward-window snapshot changed']),
		});
	});

	it('rejects changed forward-window snapshots in the bundled workflow', () => {
		const invalid = {
			...snapshots,
			supportedWindow: {
				...snapshots.supportedWindow,
				'2027-01-26': {
					...snapshots.supportedWindow['2027-01-26'],
					puzzles: snapshots.supportedWindow['2027-01-26'].puzzles.map((puzzle) =>
						puzzle.key === 'parola' ? { ...puzzle, target: 'PREZZO' } : puzzle,
					),
				},
			},
		};

		expect(validateBundledDailyCatalog(invalid)).toEqual({
			kind: 'invalid',
			issues: expect.arrayContaining(['published/sample or forward-window snapshot changed']),
		});
	});

	it('rejects invalid Paròle target length in bundled snapshots', () => {
		const invalid = {
			...snapshots,
			samples: {
				...snapshots.samples,
				'2026-01-26': {
					...snapshots.samples['2026-01-26'],
					puzzles: snapshots.samples['2026-01-26'].puzzles.map((puzzle) =>
						puzzle.key === 'parola' ? { ...puzzle, target: 'MARE', payload: { ...puzzle.payload, targetWord: 'MARE' } } : puzzle,
					),
				},
			},
		};

		expect(validateBundledDailyCatalog(invalid)).toEqual({
			kind: 'invalid',
			issues: expect.arrayContaining(['invalid daily catalog snapshot schema']),
		});
	});

	it('validates canonical puzzle specs and hidden theme metadata for every bundle', () => {
		const result = resolveDailyChallengeBundle({ challengeId: makeChallengeId('2027-01-26') });

		expect(result.kind).toBe('ready');
		if (result.kind !== 'ready') return;
		expect(validateDailyChallengeBundle(result.bundle)).toEqual({ kind: 'valid' });
		expect(result.bundle.puzzles.map((puzzle) => puzzle.key)).toEqual(CANONICAL_PUZZLE_KEYS);
		expect(result.bundle.puzzles.find((puzzle) => puzzle.key === 'impiccato')?.label).toBe('Il Palloncino');
		expect(result.bundle.theme.themeId).not.toBe(result.bundle.theme.label);
		expect(result.bundle.theme.choices).toHaveLength(4);
		expect(new Set(result.bundle.theme.choices).size).toBe(4);
		for (const puzzle of result.bundle.puzzles) {
			expect(puzzle.themeId).toBe(result.bundle.theme.themeId);
			expect(puzzle.themeLink).toContain(result.bundle.theme.label);
		}
	});

	it('returns update-required for today or future resolution outside the supported catalog window', () => {
		expect(resolveDailyChallengeBundle({ today: new Date(2027, 0, 27, 9) })).toEqual({
			kind: 'updateRequired',
			challengeId: '2027-01-27',
			reason: 'outsideSupportedRange',
			metadata: CATALOG_METADATA,
		});
		expect(resolveDailyChallengeBundle({ challengeId: makeChallengeId('2027-01-27') })).toEqual({
			kind: 'updateRequired',
			challengeId: '2027-01-27',
			reason: 'outsideSupportedRange',
			metadata: CATALOG_METADATA,
		});
	});

	it('keeps archive records with stored bundle snapshots replayable outside the current range', () => {
		const archived = resolveDailyChallengeBundle({ challengeId: makeChallengeId('2026-01-26') });

		expect(archived.kind).toBe('ready');
		if (archived.kind !== 'ready') return;
		expect(resolveArchivedChallengeBundle(archived.bundle)).toEqual({
			kind: 'ready',
			bundle: archived.bundle,
			metadata: CATALOG_METADATA,
			source: 'archiveSnapshot',
		});
	});
});
