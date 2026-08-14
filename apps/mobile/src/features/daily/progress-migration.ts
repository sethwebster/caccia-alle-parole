import { normalizeWordSearchDailyChallengePayload } from '@/features/caccia/word-search-daily';

import { CATALOG_METADATA, validateArchivedChallengeBundleShape, type DailyCatalogBundle, type DailyCatalogPuzzlePayload } from './catalog';
import { makeReleaseBaseChallengeId } from './date';
import { parseDailyProgress } from './progress-parse';
import { DAILY_PROGRESS_SCHEMA_VERSION, type DailyProgress, type DailyProgressQuarantineReason } from './progress-model';

export type DailyProgressStorageSource = 'canonical' | 'legacy';

export type DailyProgressMigrationResult =
	| { readonly kind: 'ready'; readonly progress: DailyProgress }
	| { readonly kind: 'migrated'; readonly progress: DailyProgress }
	| { readonly kind: 'unrecoverable'; readonly reason: DailyProgressQuarantineReason };

type BundleNormalization =
	| { readonly kind: 'absent' }
	| { readonly kind: 'normalized'; readonly value: unknown }
	| { readonly kind: 'invalid' };

type CanonicalProgressNormalization =
	| { readonly kind: 'ready'; readonly progress: DailyProgress }
	| { readonly kind: 'migrated'; readonly progress: DailyProgress }
	| { readonly kind: 'invalid' };

type CacciaCatalogPayload = Extract<DailyCatalogPuzzlePayload, { readonly words: readonly unknown[] }>;

export function migrateStoredDailyProgress(raw: string, source: DailyProgressStorageSource): DailyProgressMigrationResult {
	const parsed = parseStoredJson(raw);
	if (parsed.kind === 'unrecoverable') return parsed;
	if (source === 'canonical') return canonicalProgressResult(parseDailyProgress(parsed.value));
	const normalized = normalizeLegacyProgress(parsed.value);
	if (normalized === null) return { kind: 'unrecoverable', reason: 'invalidShape' };
	const progress = parseDailyProgress(normalized);
	if (progress === null || !hasValidBundleSnapshots(progress)) return { kind: 'unrecoverable', reason: 'invalidShape' };
	return { kind: 'migrated', progress };
}

function parseStoredJson(raw: string): { readonly kind: 'parsed'; readonly value: unknown } | { readonly kind: 'unrecoverable'; readonly reason: 'invalidJson' } {
	try {
		const value: unknown = JSON.parse(raw);
		return { kind: 'parsed', value };
	} catch (error) {
		if (error instanceof SyntaxError) return { kind: 'unrecoverable', reason: 'invalidJson' };
		throw error;
	}
}

function canonicalProgressResult(progress: DailyProgress | null): DailyProgressMigrationResult {
	if (progress === null) return { kind: 'unrecoverable', reason: 'invalidShape' };
	const normalized = normalizeCanonicalProgress(progress);
	if (normalized.kind === 'invalid') return { kind: 'unrecoverable', reason: 'invalidShape' };
	return normalized;
}

function normalizeCanonicalProgress(progress: DailyProgress): CanonicalProgressNormalization {
	const challenges = [];
	let changed = false;
	for (const record of progress.challenges) {
		if (record.bundleSnapshot === undefined) {
			challenges.push(record);
			continue;
		}
		const normalized = normalizeCanonicalBundleSnapshot(record.bundleSnapshot);
		if (normalized.kind === 'invalid') return { kind: 'invalid' };
		challenges.push(normalized.changed ? { ...record, bundleSnapshot: normalized.bundleSnapshot } : record);
		changed = changed || normalized.changed;
	}
	return changed ? { kind: 'migrated', progress: { ...progress, challenges } } : { kind: 'ready', progress };
}

function normalizeCanonicalBundleSnapshot(bundleSnapshot: DailyCatalogBundle):
	| { readonly kind: 'valid'; readonly bundleSnapshot: DailyCatalogBundle; readonly changed: boolean }
	| { readonly kind: 'invalid' } {
	const puzzles = [];
	let changed = false;
	for (const puzzle of bundleSnapshot.puzzles) {
		if (puzzle.key !== 'caccia') {
			puzzles.push(puzzle);
			continue;
		}
		if (!isCacciaCatalogPayload(puzzle.payload)) return { kind: 'invalid' };
		const normalized = normalizeWordSearchDailyChallengePayload(puzzle.payload);
		if (normalized.kind === 'invalid') return { kind: 'invalid' };
		puzzles.push(normalized.changed ? { ...puzzle, payload: normalized.payload } : puzzle);
		changed = changed || normalized.changed;
	}
	const normalizedBundle = changed ? { ...bundleSnapshot, puzzles } : bundleSnapshot;
	return validateArchivedChallengeBundleShape(normalizedBundle).kind === 'valid'
		? { kind: 'valid', bundleSnapshot: normalizedBundle, changed }
		: { kind: 'invalid' };
}

function isCacciaCatalogPayload(payload: DailyCatalogPuzzlePayload): payload is CacciaCatalogPayload {
	return 'grid' in payload && 'words' in payload;
}

function normalizeLegacyProgress(value: unknown): unknown | null {
	if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.challenges)) return null;
	const challenges = normalizeLegacyChallengeRecords(value.challenges);
	return challenges === null ? null : { ...value, schemaVersion: DAILY_PROGRESS_SCHEMA_VERSION, challenges };
}

function normalizeLegacyChallengeRecords(values: readonly unknown[]): readonly unknown[] | null {
	const records: unknown[] = [];
	for (const value of values) {
		const record = normalizeLegacyChallengeRecord(value);
		if (record === null) return null;
		records.push(record);
	}
	return records;
}

function normalizeLegacyChallengeRecord(value: unknown): unknown | null {
	if (!isRecord(value)) return null;
	const bundleSnapshot = normalizeLegacyBundleSnapshot(value.bundleSnapshot);
	if (bundleSnapshot.kind === 'invalid') return null;
	if (bundleSnapshot.kind === 'absent') return { ...value, migrationStatus: 'migrated' };
	return { ...value, bundleSnapshot: bundleSnapshot.value, migrationStatus: 'migrated' };
}

function normalizeLegacyBundleSnapshot(value: unknown): BundleNormalization {
	if (value === undefined) return { kind: 'absent' };
	if (!isRecord(value)) return { kind: 'invalid' };
	if (isValidReleaseBase(value.releaseBaseChallengeId)) return { kind: 'normalized', value };
	return canDeriveBundledReleaseBase(value)
		? { kind: 'normalized', value: { ...value, releaseBaseChallengeId: CATALOG_METADATA.releaseBaseChallengeId } }
		: { kind: 'invalid' };
}

function isValidReleaseBase(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	try {
		makeReleaseBaseChallengeId(value);
		return true;
	} catch (error) {
		if (error instanceof Error) return false;
		throw error;
	}
}

function canDeriveBundledReleaseBase(value: Record<string, unknown>): boolean {
	if (!isRecord(value.source) || value.source.kind !== 'bundledCatalog') return false;
	// Repairing a missing release base stays deliberately strict: if the snapshot
	// does not match the current catalog exactly we cannot safely invent one, so
	// it is quarantined instead. Legitimate older snapshots already carry a valid
	// release base and never reach here.
	return value.source.epoch === CATALOG_METADATA.catalogEpoch
		&& value.source.version === CATALOG_METADATA.catalogVersion
		&& value.catalogEpoch === CATALOG_METADATA.catalogEpoch
		&& value.catalogVersion === CATALOG_METADATA.catalogVersion
		&& value.supportedFromChallengeId === CATALOG_METADATA.supportedFromChallengeId
		&& value.supportedThroughChallengeId === CATALOG_METADATA.supportedThroughChallengeId
		&& CATALOG_METADATA.supportedFromChallengeId === CATALOG_METADATA.releaseBaseChallengeId;
}

function hasValidBundleSnapshots(progress: DailyProgress): boolean {
	return progress.challenges.every((record) => record.bundleSnapshot === undefined || validateArchivedChallengeBundleShape(record.bundleSnapshot).kind === 'valid');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
