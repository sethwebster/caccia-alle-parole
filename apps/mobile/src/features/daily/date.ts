import type {
	CatalogEpoch,
	CatalogVersion,
	ChallengeId,
	LocalCivilDate,
	ReleaseBaseChallengeId,
	StreakDate,
	SupportedDateRange,
} from './types';

const LOCAL_CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class InvalidLocalCivilDateError extends Error {
	readonly name = 'InvalidLocalCivilDateError';

	constructor(readonly value: string) {
		super(`Invalid local civil date: ${value}`);
	}
}

export type StreakDateComparison = 'same' | 'consecutive' | 'gap' | 'before';

export function localCivilDateForDate(date: Date): LocalCivilDate {
	return makeLocalCivilDate(
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
	);
}

export function challengeIdForDate(date = new Date()): ChallengeId {
	return makeChallengeId(localCivilDateForDate(date));
}

export function streakDateForDate(date = new Date()): StreakDate {
	return makeStreakDate(localCivilDateForDate(date));
}

export function nextStreakDate(streakDate: StreakDate): StreakDate {
	const { year, month, day } = localCivilParts(streakDate);
	return streakDateForDate(new Date(year, month - 1, day + 1));
}

export function challengeIdAfterDays(challengeId: ChallengeId, days: number): ChallengeId {
	const { year, month, day } = localCivilParts(challengeId);
	return challengeIdForDate(new Date(year, month - 1, day + days));
}

export function compareStreakDates(previous: StreakDate, candidate: StreakDate): StreakDateComparison {
	if (candidate === previous) return 'same';
	if (candidate === nextStreakDate(previous)) return 'consecutive';
	return candidate < previous ? 'before' : 'gap';
}

export function makeLocalCivilDate(value: string): LocalCivilDate {
	const match = LOCAL_CIVIL_DATE_PATTERN.exec(value);
	if (match === null) throw new InvalidLocalCivilDateError(value);
	const [, yearText, monthText, dayText] = match;
	if (yearText === undefined || monthText === undefined || dayText === undefined) {
		throw new InvalidLocalCivilDateError(value);
	}
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		throw new InvalidLocalCivilDateError(value);
	}
	return value as LocalCivilDate;
}

export function makeChallengeId(value: string | LocalCivilDate): ChallengeId {
	return makeLocalCivilDate(value) as ChallengeId;
}

export function makeStreakDate(value: string | LocalCivilDate): StreakDate {
	return makeLocalCivilDate(value) as StreakDate;
}

export function makeCatalogEpoch(value: string): CatalogEpoch {
	return value as CatalogEpoch;
}

export function makeCatalogVersion(value: string): CatalogVersion {
	return value as CatalogVersion;
}

export function makeReleaseBaseChallengeId(value: string | ChallengeId): ReleaseBaseChallengeId {
	return makeChallengeId(value) as ReleaseBaseChallengeId;
}

export function makeSupportedDateRange(input: { readonly start: string; readonly endInclusive: string }): SupportedDateRange {
	return {
		start: makeChallengeId(input.start),
		endInclusive: makeChallengeId(input.endInclusive),
	};
}

function localCivilParts(date: LocalCivilDate): { readonly year: number; readonly month: number; readonly day: number } {
	return {
		year: Number(date.slice(0, 4)),
		month: Number(date.slice(5, 7)),
		day: Number(date.slice(8, 10)),
	};
}
