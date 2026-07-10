import { DailyAdapterValidationError, dailyPuzzleAdapters } from './adapters';
import type { DailyCatalogBundle, DailyCatalogPuzzlePayload } from './catalog';
import { makeCatalogEpoch, makeCatalogVersion, makeChallengeId, makeReleaseBaseChallengeId, makeStreakDate } from './date';
import type { ChallengeSource, DailyPuzzleKey, ThemeQuizData } from './types';

export type DailyChallengeSnapshots = {
	readonly schemaVersion: number;
	readonly metadata: {
		readonly catalogEpoch: string;
		readonly catalogVersion: string;
		readonly releaseBaseChallengeId: string;
		readonly supportedFromChallengeId: string;
		readonly supportedThroughChallengeId: string;
	};
	readonly samples: Record<string, DailyCatalogBundle>;
	readonly supportedWindow: Record<string, DailyCatalogBundle>;
};

type SnapshotBundle = Omit<DailyCatalogBundle, 'challengeId' | 'streakDate' | 'source' | 'releaseBaseChallengeId' | 'catalogEpoch' | 'catalogVersion' | 'supportedFromChallengeId' | 'supportedThroughChallengeId'> & {
	readonly challengeId: string;
	readonly streakDate: string;
	readonly source: { readonly kind: string; readonly epoch: string; readonly version: string };
	readonly releaseBaseChallengeId: string;
	readonly catalogEpoch: string;
	readonly catalogVersion: string;
	readonly supportedFromChallengeId: string;
	readonly supportedThroughChallengeId: string;
};

export function parseDailyChallengeSnapshots(value: unknown): DailyChallengeSnapshots | null {
	const record = objectValue(value);
	if (record === null) return null;
	const metadata = parseSnapshotMetadata(fieldValue(record, 'metadata'));
	const samples = parseSnapshotGroup(fieldValue(record, 'samples'));
	const supportedWindow = parseSnapshotGroup(fieldValue(record, 'supportedWindow'));
	const schemaVersion = fieldValue(record, 'schemaVersion');
	if (typeof schemaVersion !== 'number' || metadata === null || samples === null || supportedWindow === null) return null;
	return { schemaVersion, metadata, samples, supportedWindow };
}

function parseSnapshotMetadata(value: unknown): DailyChallengeSnapshots['metadata'] | null {
	const record = objectValue(value);
	if (record === null) return null;
	const catalogEpoch = fieldValue(record, 'catalogEpoch');
	const catalogVersion = fieldValue(record, 'catalogVersion');
	const releaseBaseChallengeId = fieldValue(record, 'releaseBaseChallengeId');
	const supportedFromChallengeId = fieldValue(record, 'supportedFromChallengeId');
	const supportedThroughChallengeId = fieldValue(record, 'supportedThroughChallengeId');
	if (typeof catalogEpoch !== 'string' || typeof catalogVersion !== 'string' || typeof releaseBaseChallengeId !== 'string' || typeof supportedFromChallengeId !== 'string' || typeof supportedThroughChallengeId !== 'string') return null;
	return { catalogEpoch, catalogVersion, releaseBaseChallengeId, supportedFromChallengeId, supportedThroughChallengeId };
}

function parseSnapshotGroup(value: unknown): Record<string, DailyCatalogBundle> | null {
	const record = objectValue(value);
	if (record === null) return null;
	const output: Record<string, DailyCatalogBundle> = {};
	for (const key of Object.keys(record)) {
		const bundle = parseSnapshotBundle(fieldValue(record, key));
		if (bundle === null) return null;
		output[key] = bundle;
	}
	return output;
}

function parseSnapshotBundle(value: unknown): DailyCatalogBundle | null {
	const raw = parseRawSnapshotBundle(value);
	if (raw === null) return null;
	try {
		const source = challengeSource(raw.source);
		if (source === null) return null;
		return {
			...raw,
			challengeId: makeChallengeId(raw.challengeId),
			streakDate: makeStreakDate(raw.streakDate),
			source,
			releaseBaseChallengeId: makeReleaseBaseChallengeId(raw.releaseBaseChallengeId),
			catalogEpoch: makeCatalogEpoch(raw.catalogEpoch),
			catalogVersion: makeCatalogVersion(raw.catalogVersion),
			supportedFromChallengeId: makeChallengeId(raw.supportedFromChallengeId),
			supportedThroughChallengeId: makeChallengeId(raw.supportedThroughChallengeId),
		};
	} catch (error) {
		if (error instanceof Error) return null;
		throw error;
	}
}

function parseRawSnapshotBundle(value: unknown): SnapshotBundle | null {
	const record = objectValue(value);
	if (record === null) return null;
	const challengeId = fieldValue(record, 'challengeId');
	const streakDate = fieldValue(record, 'streakDate');
	const source = parseSnapshotSource(fieldValue(record, 'source'));
	const releaseBaseChallengeId = fieldValue(record, 'releaseBaseChallengeId');
	const catalogEpoch = fieldValue(record, 'catalogEpoch');
	const catalogVersion = fieldValue(record, 'catalogVersion');
	const supportedFromChallengeId = fieldValue(record, 'supportedFromChallengeId');
	const supportedThroughChallengeId = fieldValue(record, 'supportedThroughChallengeId');
	const theme = parseSnapshotTheme(fieldValue(record, 'theme'));
	const puzzles = parseSnapshotPuzzles(fieldValue(record, 'puzzles'));
	if (typeof challengeId !== 'string' || typeof streakDate !== 'string' || source === null || typeof releaseBaseChallengeId !== 'string' || typeof catalogEpoch !== 'string' || typeof catalogVersion !== 'string' || typeof supportedFromChallengeId !== 'string' || typeof supportedThroughChallengeId !== 'string' || theme === null || puzzles === null) return null;
	return { challengeId, streakDate, source, releaseBaseChallengeId, catalogEpoch, catalogVersion, supportedFromChallengeId, supportedThroughChallengeId, theme, puzzles };
}

function parseSnapshotSource(value: unknown): SnapshotBundle['source'] | null {
	const record = objectValue(value);
	if (record === null) return null;
	const kind = fieldValue(record, 'kind');
	const epoch = fieldValue(record, 'epoch');
	const version = fieldValue(record, 'version');
	if (typeof kind !== 'string' || typeof epoch !== 'string' || typeof version !== 'string') return null;
	return { kind, epoch, version };
}

function parseSnapshotTheme(value: unknown): DailyCatalogBundle['theme'] | null {
	const record = objectValue(value);
	if (record === null) return null;
	const themeId = fieldValue(record, 'themeId');
	const label = fieldValue(record, 'label');
	const explanation = fieldValue(record, 'explanation');
	const choices = parseFourStrings(fieldValue(record, 'choices'));
	const answerIndex = fieldValue(record, 'answerIndex');
	if (typeof themeId !== 'string' || typeof label !== 'string' || typeof explanation !== 'string' || choices === null || typeof answerIndex !== 'number') return null;
	return { themeId, label, explanation, choices, answerIndex };
}

function parseSnapshotPuzzles(value: unknown): readonly SnapshotBundle['puzzles'][number][] | null {
	if (!Array.isArray(value)) return null;
	const puzzles: SnapshotBundle['puzzles'][number][] = [];
	for (const item of value) {
		const puzzle = parseSnapshotPuzzle(item);
		if (puzzle === null) return null;
		puzzles.push(puzzle);
	}
	return puzzles;
}

function parseSnapshotPuzzle(value: unknown): SnapshotBundle['puzzles'][number] | null {
	const record = objectValue(value);
	if (record === null) return null;
	const key = dailyPuzzleKeyValue(fieldValue(record, 'key'));
	const label = fieldValue(record, 'label');
	const themeQuiz = parseThemeQuiz(fieldValue(record, 'themeQuiz'));
	const themeId = fieldValue(record, 'themeId');
	const themeLink = fieldValue(record, 'themeLink');
	const generatorVersion = fieldValue(record, 'generatorVersion');
	const dictionaryVersion = fieldValue(record, 'dictionaryVersion');
	const target = fieldValue(record, 'target');
	if (key === null || typeof label !== 'string' || themeQuiz === null || typeof themeId !== 'string' || typeof themeLink !== 'string' || typeof generatorVersion !== 'string' || typeof dictionaryVersion !== 'string' || typeof target !== 'string') return null;
	const base = { key, label, themeQuiz, themeId, themeLink, generatorVersion, dictionaryVersion, target };
	const payload = parseSnapshotPuzzlePayload(base, fieldValue(record, 'payload'));
	return payload === null ? null : { ...base, payload };
}

function parseSnapshotPuzzlePayload(spec: Omit<SnapshotBundle['puzzles'][number], 'payload'>, payload: unknown): DailyCatalogPuzzlePayload | null {
	try {
		switch (spec.key) {
			case 'parola':
				return dailyPuzzleAdapters.parola.parseSpec({ ...spec, payload }).payload;
			case 'caccia':
				return dailyPuzzleAdapters.caccia.parseSpec({ ...spec, payload }).payload;
			case 'paroliere':
				return dailyPuzzleAdapters.paroliere.parseSpec({ ...spec, payload }).payload;
			case 'impiccato':
				return dailyPuzzleAdapters.impiccato.parseSpec({ ...spec, payload }).payload;
			case 'anagrammi':
				return dailyPuzzleAdapters.anagrammi.parseSpec({ ...spec, payload }).payload;
		}
	} catch (error) {
		if (error instanceof DailyAdapterValidationError) return null;
		throw error;
	}
}

function parseThemeQuiz(value: unknown): ThemeQuizData | null {
	const record = objectValue(value);
	if (record === null) return null;
	const prompt = fieldValue(record, 'prompt');
	const choices = stringArrayValue(fieldValue(record, 'choices'));
	const answerIndex = fieldValue(record, 'answerIndex');
	if (typeof prompt !== 'string' || choices === null || typeof answerIndex !== 'number') return null;
	return { prompt, choices, answerIndex };
}

function challengeSource(source: SnapshotBundle['source']): ChallengeSource | null {
	if (source.kind !== 'bundledCatalog') return null;
	return { kind: 'bundledCatalog', epoch: makeCatalogEpoch(source.epoch), version: makeCatalogVersion(source.version) };
}

function objectValue(value: unknown): object | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function fieldValue(record: object, field: string): unknown {
	return Reflect.get(record, field);
}

function parseFourStrings(value: unknown): readonly [string, string, string, string] | null {
	if (!Array.isArray(value)) return null;
	const first = value[0];
	const second = value[1];
	const third = value[2];
	const fourth = value[3];
	if (value.length !== 4 || typeof first !== 'string' || typeof second !== 'string' || typeof third !== 'string' || typeof fourth !== 'string') return null;
	return [first, second, third, fourth];
}

function stringArrayValue(value: unknown): readonly string[] | null {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
	return value;
}

function dailyPuzzleKeyValue(value: unknown): DailyPuzzleKey | null {
	switch (value) {
		case 'parola':
		case 'caccia':
		case 'paroliere':
		case 'impiccato':
		case 'anagrammi':
			return value;
		default:
			return null;
	}
}
