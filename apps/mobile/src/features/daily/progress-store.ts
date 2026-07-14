import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateStoredDailyProgress, type DailyProgressMigrationResult, type DailyProgressStorageSource } from './progress-migration';
import { progressOrEmpty } from './progress-parse';
import {
	DAILY_PROGRESS_KEY,
	DAILY_PROGRESS_LEGACY_KEY,
	DAILY_PROGRESS_QUARANTINE_KEY,
	emptyDailyProgress,
	makeProgressReady,
	type DailyProgress,
	type DailyProgressLoadState,
	type DailyProgressQuarantineEnvelope,
	type DailyProgressQuarantineReason,
	type ProgressResult,
	type ProgressStorageAdapter,
} from './progress-model';

export function createDailyProgressStore(storage: ProgressStorageAdapter = AsyncStorage): DailyProgressStore {
	return new DailyProgressStore(storage);
}

export class DailyProgressStore {
	constructor(private readonly storage: ProgressStorageAdapter) {}

	async load(): Promise<ProgressResult<DailyProgressLoadState>> {
		const canonical = await this.readStorageValue(DAILY_PROGRESS_KEY);
		if (!canonical.ok) return canonical;
		if (canonical.value !== null) return this.loadStoredProgress({ raw: canonical.value, source: 'canonical', sourceKey: DAILY_PROGRESS_KEY });
		const legacy = await this.readStorageValue(DAILY_PROGRESS_LEGACY_KEY);
		if (!legacy.ok) return legacy;
		return legacy.value === null
			? { ok: true, value: { kind: 'ready', progress: emptyDailyProgress } }
			: this.loadStoredProgress({ raw: legacy.value, source: 'legacy', sourceKey: DAILY_PROGRESS_LEGACY_KEY });
	}

	async commit(progress: DailyProgress): Promise<ProgressResult<DailyProgress>> {
		const serialized = serializeProgress(progress);
		try {
			await this.storage.setItem(DAILY_PROGRESS_KEY, serialized);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } };
			throw error;
		}
		let raw: string | null;
		try {
			raw = await this.storage.getItem(DAILY_PROGRESS_KEY);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'readFailed', message: 'Unable to read Daily Challenge progress.' } };
			throw error;
		}
		const verified = raw === null ? null : progressOrEmpty(raw);
		if (raw !== serialized || verified === null) {
			return { ok: false, error: { kind: 'verificationFailed', message: 'Daily Challenge progress write verification failed.' } };
		}
		return { ok: true, value: progress };
	}

	private async readStorageValue(key: string): Promise<ProgressResult<string | null>> {
		try {
			return { ok: true, value: await this.storage.getItem(key) };
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'readFailed', message: 'Unable to read Daily Challenge progress.' } };
			throw error;
		}
	}

	private async loadStoredProgress(input: { readonly raw: string; readonly source: DailyProgressStorageSource; readonly sourceKey: string }): Promise<ProgressResult<DailyProgressLoadState>> {
		const result = migrateStoredDailyProgress(input.raw, input.source);
		return this.resolveMigrationResult({ ...input, result });
	}

	private async resolveMigrationResult(input: { readonly raw: string; readonly sourceKey: string; readonly result: DailyProgressMigrationResult }): Promise<ProgressResult<DailyProgressLoadState>> {
		if (input.result.kind === 'ready') return { ok: true, value: { kind: 'ready', progress: input.result.progress } };
		if (input.result.kind === 'migrated') {
			const committed = await this.commit(input.result.progress);
			return committed.ok ? { ok: true, value: { kind: 'ready', progress: committed.value } } : committed;
		}
		return this.recoverUnrecoverableProgress({ sourceKey: input.sourceKey, reason: input.result.reason, raw: input.raw });
	}

	private async recoverUnrecoverableProgress(input: { readonly sourceKey: string; readonly reason: DailyProgressQuarantineReason; readonly raw: string }): Promise<ProgressResult<DailyProgressLoadState>> {
		const envelope: DailyProgressQuarantineEnvelope = { schemaVersion: 1, sourceKey: input.sourceKey, reason: input.reason, raw: input.raw };
		const serialized = JSON.stringify(envelope);
		try {
			await this.storage.setItem(DAILY_PROGRESS_QUARANTINE_KEY, serialized);
		} catch (error) {
			if (error instanceof Error) return { ok: false, error: { kind: 'writeFailed', message: 'Unable to save Daily Challenge progress.' } };
			throw error;
		}
		const quarantined = await this.readStorageValue(DAILY_PROGRESS_QUARANTINE_KEY);
		if (!quarantined.ok) return quarantined;
		if (quarantined.value !== serialized) {
			return { ok: false, error: { kind: 'verificationFailed', message: 'Daily Challenge progress quarantine verification failed.' } };
		}
		const committed = await this.commit(emptyDailyProgress);
		return committed.ok ? { ok: true, value: { kind: 'ready', progress: committed.value } } : committed;
	}
}

function serializeProgress(progress: DailyProgress): string {
	return JSON.stringify(makeProgressReady(progress));
}
