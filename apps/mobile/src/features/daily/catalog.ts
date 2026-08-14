import {
	makeCatalogEpoch,
	makeCatalogVersion,
	challengeIdAfterDays,
	makeChallengeId,
	makeReleaseBaseChallengeId,
	makeStreakDate,
} from './date';
import {
	CANONICAL_PUZZLE_KEYS,
	CANONICAL_PUZZLE_LABELS,
	type CatalogEpoch,
	type CatalogVersion,
	type ChallengeId,
	type DailyChallengeBundle,
} from './types';
import { CATALOG_ROTATION_BASE } from './catalog-content';
import {
	buildCatalogPuzzle,
	buildCatalogTheme,
	pickCatalogTheme,
	type DailyCatalogPuzzleSpec,
	type DailyCatalogTheme,
} from './catalog-puzzle-builder';

export type { DailyCatalogPuzzlePayload, DailyCatalogPuzzleSpec } from './catalog-puzzle-builder';

const CATALOG_EPOCH = makeCatalogEpoch('daily-v1');
const CATALOG_VERSION = makeCatalogVersion('2026.08.12');
const RELEASE_BASE_CHALLENGE_ID = makeReleaseBaseChallengeId(CATALOG_ROTATION_BASE);
const SUPPORTED_FROM_CHALLENGE_ID = makeChallengeId(CATALOG_ROTATION_BASE);
export const SUPPORTED_FORWARD_WINDOW_DAYS = 365;
const SUPPORTED_THROUGH_CHALLENGE_ID = challengeIdAfterDays(RELEASE_BASE_CHALLENGE_ID, SUPPORTED_FORWARD_WINDOW_DAYS);
export const DAILY_CATALOG_SCHEMA_VERSION = 1;
export const DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS = [makeChallengeId('2026-01-26'), makeChallengeId('2026-02-14'), makeChallengeId('2026-07-09')] as const;
export const DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS = [makeChallengeId('2026-01-26'), makeChallengeId('2026-07-25'), SUPPORTED_THROUGH_CHALLENGE_ID] as const;

export const CATALOG_METADATA = {
	catalogEpoch: CATALOG_EPOCH,
	catalogVersion: CATALOG_VERSION,
	releaseBaseChallengeId: RELEASE_BASE_CHALLENGE_ID,
	supportedFromChallengeId: SUPPORTED_FROM_CHALLENGE_ID,
	supportedThroughChallengeId: SUPPORTED_THROUGH_CHALLENGE_ID,
} as const;

export type DailyCatalogBundle = Omit<DailyChallengeBundle, 'puzzles'> & {
	readonly catalogEpoch: CatalogEpoch;
	readonly catalogVersion: CatalogVersion;
	readonly supportedFromChallengeId: ChallengeId;
	readonly supportedThroughChallengeId: ChallengeId;
	readonly theme: DailyCatalogTheme;
	readonly puzzles: readonly DailyCatalogPuzzleSpec[];
};

export type DailyCatalogResolution =
	| {
			readonly kind: 'ready';
			readonly bundle: DailyCatalogBundle;
			readonly metadata: typeof CATALOG_METADATA;
			readonly source: 'bundledCatalog' | 'archiveSnapshot';
	  }
		| {
				readonly kind: 'updateRequired';
				readonly challengeId: ChallengeId;
				readonly reason: 'outsideSupportedRange' | 'unsupportedEpoch' | 'corruptCatalog';
				readonly metadata: typeof CATALOG_METADATA;
		  };

export type DailyCatalogValidation = { readonly kind: 'valid' } | { readonly kind: 'invalid'; readonly reason: string };

export function resolveDailyChallengeBundle(input: {
	readonly challengeId?: ChallengeId;
	readonly today?: Date;
	readonly expectedEpoch?: CatalogEpoch;
}): DailyCatalogResolution {
	const challengeId = input.challengeId ?? challengeIdFromDate(input.today ?? new Date());
	if (input.expectedEpoch !== undefined && input.expectedEpoch !== CATALOG_METADATA.catalogEpoch) {
		return { kind: 'updateRequired', challengeId, reason: 'unsupportedEpoch', metadata: CATALOG_METADATA };
	}
	if (challengeId < CATALOG_METADATA.supportedFromChallengeId || challengeId > CATALOG_METADATA.supportedThroughChallengeId) {
		return { kind: 'updateRequired', challengeId, reason: 'outsideSupportedRange', metadata: CATALOG_METADATA };
	}
	const bundle = buildDailyChallengeBundle(challengeId);
	const validation = validateDailyChallengeBundle(bundle);
	if (validation.kind === 'invalid') return { kind: 'updateRequired', challengeId, reason: 'corruptCatalog', metadata: CATALOG_METADATA };
	return { kind: 'ready', bundle, metadata: CATALOG_METADATA, source: 'bundledCatalog' };
}

export function resolveArchivedChallengeBundle(bundle: DailyCatalogBundle): DailyCatalogResolution {
	return { kind: 'ready', bundle, metadata: CATALOG_METADATA, source: 'archiveSnapshot' };
}

export function generateChallengeSnapshots() {
	return {
		schemaVersion: DAILY_CATALOG_SCHEMA_VERSION,
		metadata: CATALOG_METADATA,
		samples: {
			'2026-01-26': buildDailyChallengeBundle(DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS[0]),
			'2026-02-14': buildDailyChallengeBundle(DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS[1]),
			'2026-07-09': buildDailyChallengeBundle(DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS[2]),
		},
		supportedWindow: {
			'2026-01-26': buildDailyChallengeBundle(DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS[0]),
			'2026-07-25': buildDailyChallengeBundle(DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS[1]),
			'2027-01-26': buildDailyChallengeBundle(DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS[2]),
		},
	};
}

export function validateDailyChallengeBundle(bundle: DailyCatalogBundle): DailyCatalogValidation {
	if (bundle.catalogVersion !== CATALOG_METADATA.catalogVersion) return { kind: 'invalid', reason: 'catalog metadata mismatch' };
	return validateArchivedChallengeBundleShape(bundle);
}

/**
 * Stored snapshots outlive the catalog that wrote them — a content release bumps
 * catalogVersion, and every archived day still has the old one. Version equality
 * is therefore only meaningful for freshly generated bundles; applying it to
 * stored progress quarantines the player's entire history. Epoch and structure
 * still have to hold.
 */
export function validateArchivedChallengeBundleShape(bundle: DailyCatalogBundle): DailyCatalogValidation {
	if (bundle.catalogEpoch !== CATALOG_METADATA.catalogEpoch) {
		return { kind: 'invalid', reason: 'catalog metadata mismatch' };
	}
	if (bundle.theme.choices.length !== 4 || new Set(bundle.theme.choices).size !== 4) {
		return { kind: 'invalid', reason: 'theme choices must contain four unique values' };
	}
	if (bundle.theme.choices[bundle.theme.answerIndex] !== bundle.theme.label) {
		return { kind: 'invalid', reason: 'theme answer must point at the localized label' };
	}
	if (bundle.puzzles.length !== CANONICAL_PUZZLE_KEYS.length) {
		return { kind: 'invalid', reason: 'bundle must contain all canonical puzzles' };
	}
	const keys = bundle.puzzles.map((puzzle) => puzzle.key);
	if (new Set(keys).size !== CANONICAL_PUZZLE_KEYS.length) {
		return { kind: 'invalid', reason: 'bundle puzzle keys must be unique' };
	}
	for (const key of CANONICAL_PUZZLE_KEYS) {
		const puzzle = bundle.puzzles.find((candidate) => candidate.key === key);
		if (puzzle === undefined) return { kind: 'invalid', reason: `missing ${key} puzzle` };
		if (puzzle.label !== CANONICAL_PUZZLE_LABELS[key]) return { kind: 'invalid', reason: `invalid ${key} label` };
		if (puzzle.themeId !== bundle.theme.themeId) return { kind: 'invalid', reason: `invalid ${key} theme linkage` };
		if (puzzle.themeQuiz.answerIndex !== bundle.theme.answerIndex) {
			return { kind: 'invalid', reason: `invalid ${key} theme quiz answer` };
		}
	}
	return { kind: 'valid' };
}

function buildDailyChallengeBundle(challengeId: ChallengeId): DailyCatalogBundle {
	const themeSeed = pickCatalogTheme(challengeId);
	const theme = buildCatalogTheme(challengeId, themeSeed);
	return {
		challengeId,
		streakDate: makeStreakDate(challengeId),
		source: { kind: 'bundledCatalog', epoch: CATALOG_METADATA.catalogEpoch, version: CATALOG_METADATA.catalogVersion },
		releaseBaseChallengeId: CATALOG_METADATA.releaseBaseChallengeId,
		catalogEpoch: CATALOG_METADATA.catalogEpoch,
		catalogVersion: CATALOG_METADATA.catalogVersion,
		supportedFromChallengeId: CATALOG_METADATA.supportedFromChallengeId,
		supportedThroughChallengeId: CATALOG_METADATA.supportedThroughChallengeId,
		theme,
		puzzles: CANONICAL_PUZZLE_KEYS.map((key) => buildCatalogPuzzle(challengeId, key, themeSeed, theme)),
	};
}

function challengeIdFromDate(date: Date): ChallengeId {
	return makeChallengeId(
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
	);
}
