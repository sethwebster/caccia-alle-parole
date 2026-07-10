import { CATALOG_METADATA, resolveDailyChallengeBundle } from './catalog';
import { challengeIdForDate, makeChallengeId } from './date';
import { DAILY_COPY, type DailyStateCopy } from './daily-copy';
import { formatCatalogAvailability, formatCatalogSource, formatCatalogVersion, formatDailyChallengeDate } from './daily-format';
import { dailyProgressErrorState } from './daily-state-copy';
import { createDailyProgressStore, type DailyProgressStore } from './progress';
import { hasAllOfficialTerminalEvents, type DailyChallengeProgressRecord, type DailyProgress } from './progress-model';
import type { ChallengeId } from './types';

export type DailyArchiveItem = {
	readonly challengeId: ChallengeId;
	readonly dateLabel: string;
	readonly statusLabel: string;
	readonly statusTone: 'today' | 'missed' | 'playing' | 'completed' | 'replay';
	readonly replayLabel: string;
	readonly canReplay: boolean;
	readonly officialLabel: string;
	readonly sourceLabel: string;
	readonly catalogLabel: string;
	readonly replayCount: number;
};

export type DailyArchiveModel =
	| ({ readonly kind: 'loading' } & DailyStateCopy)
	| { readonly kind: 'ready'; readonly title: string; readonly localOnlyCaveat: string; readonly items: readonly DailyArchiveItem[] }
	| ({ readonly kind: 'error' } & DailyStateCopy);

export async function loadDailyArchiveModel(input: { readonly now?: Date; readonly store?: DailyProgressStore } = {}): Promise<DailyArchiveModel> {
	const store = input.store ?? createDailyProgressStore();
	const loaded = await store.load();
	if (!loaded.ok) return { kind: 'error', ...dailyProgressErrorState(loaded.error) };
	if (loaded.value.kind === 'quarantined') return { kind: 'error', eyebrow: 'RECUPERO ARCHIVIO', title: 'Archivio da recuperare', message: loaded.value.message, detail: 'I dati originali restano protetti finché la cronologia non torna coerente.', tone: 'warning' };
	const today = challengeIdForDate(input.now ?? new Date());
	const progress = loaded.value.progress;
	return {
		kind: 'ready',
		title: DAILY_COPY.archive.title,
		localOnlyCaveat: DAILY_COPY.archive.localOnlyCaveat,
		items: releasedChallengeIds(today, progress).map((challengeId) => archiveItem(challengeId, today, progress)),
	};
}

function releasedChallengeIds(today: ChallengeId, progress: DailyProgress): readonly ChallengeId[] {
	const ids = new Set<string>();
	for (const challengeId of catalogReleasedIds(today)) ids.add(challengeId);
	for (const record of progress.challenges) {
		if (record.challengeId <= today) ids.add(record.challengeId);
	}
	return [...ids].sort((left, right) => right.localeCompare(left)).map(makeChallengeId);
}

function catalogReleasedIds(today: ChallengeId): readonly ChallengeId[] {
	const end = today < CATALOG_METADATA.supportedThroughChallengeId ? today : CATALOG_METADATA.supportedThroughChallengeId;
	const ids: ChallengeId[] = [];
	let cursor = CATALOG_METADATA.supportedFromChallengeId;
	while (cursor <= end) {
		ids.push(cursor);
		cursor = nextChallengeId(cursor);
	}
	return ids;
}

function archiveItem(challengeId: ChallengeId, today: ChallengeId, progress: DailyProgress): DailyArchiveItem {
	const record = progress.challenges.find((candidate) => candidate.challengeId === challengeId);
	const releasedBeforeToday = challengeId < today;
	const completed = record === undefined ? false : hasAllOfficialTerminalEvents(record);
	const canReplay = releasedBeforeToday || completed;
	const status = archiveStatus({ challengeId, today, record, completed });
	return {
		challengeId,
		dateLabel: formatDailyChallengeDate(challengeId),
		statusLabel: status.label,
		statusTone: status.tone,
		replayLabel: canReplay ? (completed ? DAILY_COPY.archive.replay.completed : DAILY_COPY.archive.replay.missed) : DAILY_COPY.archive.replay.locked,
		canReplay,
		officialLabel: officialLabel(record, completed),
		sourceLabel: sourceLabel(record),
		catalogLabel: catalogLabel(challengeId, record),
		replayCount: record?.replayAttempts.length ?? 0,
	};
}

function archiveStatus(input: { readonly challengeId: ChallengeId; readonly today: ChallengeId; readonly record: DailyChallengeProgressRecord | undefined; readonly completed: boolean }): { readonly label: string; readonly tone: DailyArchiveItem['statusTone'] } {
	if (input.completed) return { label: DAILY_COPY.archive.status.completed, tone: 'completed' };
	if (input.record?.replayAttempts.length) return { label: DAILY_COPY.archive.status.replayOnly, tone: 'replay' };
	if (input.record !== undefined) return { label: DAILY_COPY.archive.status.playing, tone: 'playing' };
	if (input.challengeId === input.today) return { label: DAILY_COPY.archive.status.today, tone: 'today' };
	return { label: DAILY_COPY.archive.status.missed, tone: 'missed' };
}

function officialLabel(record: DailyChallengeProgressRecord | undefined, completed: boolean): string {
	if (record === undefined) return DAILY_COPY.archive.official.none;
	if (completed) return DAILY_COPY.archive.official.completed;
	return DAILY_COPY.archive.official.playing;
}

function sourceLabel(record: DailyChallengeProgressRecord | undefined): string {
	if (record?.bundleSnapshot !== undefined) return DAILY_COPY.catalog.localCopy;
	if (record?.source != null) return formatCatalogSource(record.source);
	return DAILY_COPY.catalog.installed;
}

function catalogLabel(challengeId: ChallengeId, record: DailyChallengeProgressRecord | undefined): string {
	if (record?.bundleSnapshot !== undefined) return formatCatalogVersion(record.bundleSnapshot.catalogVersion);
	const resolution = resolveDailyChallengeBundle({ challengeId });
	return resolution.kind === 'ready' ? formatCatalogAvailability(challengeId) : DAILY_COPY.catalog.requiresLocalCopy;
}

function nextChallengeId(challengeId: ChallengeId): ChallengeId {
	const value = String(challengeId);
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	return makeChallengeIdFromDate(new Date(year, month - 1, day + 1));
}

function makeChallengeIdFromDate(date: Date): ChallengeId {
	return makeChallengeId(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
}
