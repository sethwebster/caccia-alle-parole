import { DAILY_COPY } from './daily-copy';
import { CANONICAL_PUZZLE_KEYS, type ChallengeId, type ChallengeSource } from './types';

export function formatDailyChallengeDate(challengeId: string): string {
	const [year, month, day] = challengeId.split('-').map(Number);
	if (year === undefined || month === undefined || day === undefined) return challengeId;
	return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}

export function formatDailyDays(days: number): string {
	return `${days} ${days === 1 ? 'giorno' : 'giorni'}`;
}

export function formatDailyWins(wins: number): string {
	return `${wins}/${CANONICAL_PUZZLE_KEYS.length} vittorie`;
}

export function formatDailyProgress(done: number, total: number): string {
	return `${done}/${total} giochi conclusi`;
}

export function formatCatalogSource(source: ChallengeSource): string {
	switch (source.kind) {
		case 'bundledCatalog':
			return `${DAILY_COPY.catalog.installed} · ${source.epoch}`;
		case 'generatedPreview':
			return `${DAILY_COPY.catalog.preview} · ${source.label}`;
	}
}

export function formatCatalogVersion(version: string): string {
	return `${DAILY_COPY.route.catalogMeta.version} ${version}`;
}

export function formatCatalogWindow(supportedFrom: string, supportedThrough: string): string {
	return `${formatDailyChallengeDate(supportedFrom)} - ${formatDailyChallengeDate(supportedThrough)}`;
}

export function formatReplayCount(count: number): string {
	if (count === 1) return DAILY_COPY.replayBadge.savedSingular;
	return `${count} replay locali salvati`;
}

export function archiveReplayCount(count: number): string {
	return count === 1 ? '1 replay locale' : `${count} replay locali`;
}

export function formatCatalogAvailability(challengeId: ChallengeId): string {
	return `${DAILY_COPY.catalog.available} ${formatDailyChallengeDate(challengeId)}`;
}
