import { dailyPuzzleAdapters } from './adapters';
import {
	CATALOG_METADATA,
	DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS,
	DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS,
	DAILY_CATALOG_SCHEMA_VERSION,
	SUPPORTED_FORWARD_WINDOW_DAYS,
	generateChallengeSnapshots,
	validateDailyChallengeBundle,
	type DailyCatalogBundle,
} from './catalog';
import { CATALOG_CONTENT_SCHEMA_VERSION, THEMES, type ThemeSeed } from './catalog-content';
import { parseDailyChallengeSnapshots } from './catalog-snapshot-parse';
import { challengeIdAfterDays } from './date';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId } from './types';

export type DailyCatalogWorkflowValidation =
	| { readonly kind: 'valid'; readonly checkedSnapshots: number }
	| { readonly kind: 'invalid'; readonly issues: readonly string[] };

type SnapshotGroup = 'samples' | 'supportedWindow';

export function validateBundledDailyCatalog(input: unknown): DailyCatalogWorkflowValidation {
	const snapshots = parseDailyChallengeSnapshots(input);
	if (snapshots === null) return { kind: 'invalid', issues: ['invalid daily catalog snapshot schema'] };
	const issues = [
		...validateCatalogMetadata(snapshots),
		...validateChallengeIdList('published sample dates', DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS),
		...validateChallengeIdList('forward-window snapshot dates', DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS),
		...validateThemeSeeds(),
		...validateTerminalCapabilities(),
		...validateSnapshotGroup('samples', snapshots.samples, DAILY_CATALOG_PUBLISHED_CHALLENGE_IDS),
		...validateSnapshotGroup('supportedWindow', snapshots.supportedWindow, DAILY_CATALOG_FORWARD_WINDOW_SNAPSHOT_IDS),
		...validateFrozenSnapshots(input),
	];
	return issues.length === 0 ? { kind: 'valid', checkedSnapshots: checkedSnapshotCount(snapshots) } : { kind: 'invalid', issues };
}

function validateCatalogMetadata(snapshots: ReturnType<typeof parseDailyChallengeSnapshots> & {}): readonly string[] {
	const issues: string[] = [];
	if (snapshots.schemaVersion !== DAILY_CATALOG_SCHEMA_VERSION) issues.push('schema-version mismatch');
	if (snapshots.metadata.catalogEpoch !== CATALOG_METADATA.catalogEpoch) issues.push('catalogEpoch mismatch');
	if (snapshots.metadata.catalogVersion !== CATALOG_METADATA.catalogVersion) issues.push('catalogVersion mismatch');
	if (snapshots.metadata.releaseBaseChallengeId !== CATALOG_METADATA.releaseBaseChallengeId) issues.push('releaseBaseChallengeId mismatch');
	if (snapshots.metadata.supportedFromChallengeId !== CATALOG_METADATA.supportedFromChallengeId) issues.push('supportedFromChallengeId mismatch');
	if (snapshots.metadata.supportedThroughChallengeId !== CATALOG_METADATA.supportedThroughChallengeId) issues.push('supportedThroughChallengeId mismatch');
	if (CATALOG_METADATA.supportedThroughChallengeId !== challengeIdAfterDays(CATALOG_METADATA.releaseBaseChallengeId, SUPPORTED_FORWARD_WINDOW_DAYS)) issues.push('supported range math mismatch');
	return issues;
}

function validateChallengeIdList(label: string, challengeIds: readonly ChallengeId[]): readonly string[] {
	const issues: string[] = [];
	const values = challengeIds.map((challengeId) => String(challengeId));
	if (new Set(values).size !== values.length) issues.push(`${label} contain duplicate dates`);
	const sorted = [...values].sort();
	if (values.some((value, index) => value !== sorted[index])) issues.push(`${label} must be append-only ascending`);
	return issues;
}

function validateThemeSeeds(): readonly string[] {
	const issues: string[] = [];
	if (CATALOG_CONTENT_SCHEMA_VERSION !== DAILY_CATALOG_SCHEMA_VERSION) issues.push('catalog-content schema-version mismatch');
	for (const theme of THEMES) issues.push(...validateThemeSeed(theme));
	return issues;
}

function validateThemeSeed(theme: ThemeSeed): readonly string[] {
	const issues: string[] = [];
	if (theme.themeId.length === 0) issues.push('missing hidden theme id');
	if (theme.label.length === 0) issues.push(`${theme.themeId} missing localized theme label`);
	if (theme.explanation.length === 0) issues.push(`${theme.themeId} missing theme explanation`);
	const normalizedLabel = normalizedText(theme.label);
	const normalizedDistractors = theme.distractors.map(normalizedText);
	if (new Set(normalizedDistractors).size !== normalizedDistractors.length) issues.push(`${theme.themeId} has duplicate distractors`);
	if (normalizedDistractors.includes(normalizedLabel)) issues.push(`${theme.themeId} has answer-equivalent distractor`);
	if (theme.distractors.some((distractor) => normalizedText(distractor).length < 4)) issues.push(`${theme.themeId} has weak distractor`);
	for (const key of CANONICAL_PUZZLE_KEYS) {
		const words = theme.puzzleWords[key];
		if (words.length !== 3) issues.push(`${theme.themeId} missing ${key} puzzle linkage`);
		if (new Set(words.map(normalizedText)).size !== words.length) issues.push(`${theme.themeId} duplicate ${key} puzzle words`);
	}
	return issues;
}

function validateTerminalCapabilities(): readonly string[] {
	const issues: string[] = [];
	for (const key of CANONICAL_PUZZLE_KEYS) {
		try {
			dailyPuzzleAdapters[key].handleTerminal('skip', {
				challengeId: CATALOG_METADATA.releaseBaseChallengeId,
				puzzleKey: key,
				attemptKind: 'official',
				attemptId: `${key}-attempt`,
				terminalEventId: `${key}-terminal`,
			});
		} catch (error) {
			if (error instanceof Error) issues.push(`${key} missing terminal capability: ${error.message}`);
			else throw error;
		}
	}
	return issues;
}

function validateSnapshotGroup(group: SnapshotGroup, snapshots: Record<string, DailyCatalogBundle>, expectedChallengeIds: readonly ChallengeId[]): readonly string[] {
	const issues: string[] = [];
	const expectedKeys = expectedChallengeIds.map((challengeId) => String(challengeId));
	const actualKeys = Object.keys(snapshots).sort();
	if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) issues.push(`${group} snapshot dates changed`);
	for (const challengeId of expectedChallengeIds) {
		const bundle = snapshots[challengeId];
		if (bundle === undefined) issues.push(`${group} missing ${challengeId}`);
		else issues.push(...validateSnapshotBundle(group, bundle));
	}
	return issues;
}

function validateSnapshotBundle(group: SnapshotGroup, bundle: DailyCatalogBundle): readonly string[] {
	const validation = validateDailyChallengeBundle(bundle);
	const issues: string[] = validation.kind === 'valid' ? [] : [`${group} ${bundle.challengeId}: ${validation.reason}`];
	if (bundle.theme.themeId.length === 0) issues.push(`${group} ${bundle.challengeId}: missing hidden theme id`);
	if (bundle.theme.label.length === 0) issues.push(`${group} ${bundle.challengeId}: missing localized theme label`);
	if (bundle.theme.explanation.length === 0) issues.push(`${group} ${bundle.challengeId}: missing theme explanation`);
		for (const puzzle of bundle.puzzles) {
			if (puzzle.generatorVersion.length === 0) issues.push(`${group} ${bundle.challengeId} ${puzzle.key}: missing generatorVersion`);
			if (puzzle.dictionaryVersion.length === 0) issues.push(`${group} ${bundle.challengeId} ${puzzle.key}: missing dictionaryVersion`);
			if (puzzle.target.length === 0 || puzzle.target !== puzzle.target.toUpperCase()) issues.push(`${group} ${bundle.challengeId} ${puzzle.key}: invalid puzzle spec target`);
			if (puzzle.themeId !== bundle.theme.themeId) issues.push(`${group} ${bundle.challengeId} ${puzzle.key}: missing per-puzzle theme linkage`);
			if (!puzzle.themeLink.includes(puzzle.target) || !puzzle.themeLink.includes(bundle.theme.label)) issues.push(`${group} ${bundle.challengeId} ${puzzle.key}: weak per-puzzle theme linkage`);
			issues.push(...validateAdapterPayload(group, bundle, puzzle));
		}
		return issues;
}

function validateAdapterPayload(group: SnapshotGroup, bundle: DailyCatalogBundle, puzzle: DailyCatalogBundle['puzzles'][number]): readonly string[] {
	try {
		switch (puzzle.key) {
			case 'parola':
				dailyPuzzleAdapters.parola.initialize(dailyPuzzleAdapters.parola.parseSpec(puzzle));
				return [];
			case 'caccia':
				dailyPuzzleAdapters.caccia.initialize(dailyPuzzleAdapters.caccia.parseSpec(puzzle));
				return [];
			case 'paroliere':
				dailyPuzzleAdapters.paroliere.initialize(dailyPuzzleAdapters.paroliere.parseSpec(puzzle));
				return [];
			case 'impiccato':
				dailyPuzzleAdapters.impiccato.initialize(dailyPuzzleAdapters.impiccato.parseSpec(puzzle));
				return [];
			case 'anagrammi':
				dailyPuzzleAdapters.anagrammi.initialize(dailyPuzzleAdapters.anagrammi.parseSpec(puzzle));
				return [];
		}
	} catch (error) {
		if (error instanceof Error) return [`${group} ${bundle.challengeId} ${puzzle.key}: invalid adapter payload ${error.message}`];
		throw error;
	}
}

function validateFrozenSnapshots(snapshots: unknown): readonly string[] {
	return JSON.stringify(snapshots) === JSON.stringify(generateChallengeSnapshots()) ? [] : ['published/sample or forward-window snapshot changed'];
}

function checkedSnapshotCount(snapshots: ReturnType<typeof parseDailyChallengeSnapshots> & {}): number {
	return Object.keys(snapshots.samples).length + Object.keys(snapshots.supportedWindow).length;
}

function normalizedText(value: string): string {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
}
