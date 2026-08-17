import { describe, expect, it } from 'vitest';

import { selectOfficialAttemptGate, type OfficialAttemptGateState } from './official-attempt-gate';

const base: OfficialAttemptGateState = {
	enabled: true,
	mode: 'official',
	isUpdateAvailable: false,
	isUpdatePending: false,
	isDownloading: false,
	isRestarting: false,
};

/**
 * The daily grid is a pure function of the challenge ID, but which words score
 * comes from the bundled dictionary — so a stale build plays the same board
 * under different rules. Official attempts wait for the current build.
 */
describe('official attempt gate', () => {
	it('opens when the build is current', () => {
		expect(selectOfficialAttemptGate(base)).toEqual({ kind: 'open' });
	});

	it('blocks official play on a downloaded update and offers a restart', () => {
		const gate = selectOfficialAttemptGate({ ...base, isUpdatePending: true });

		expect(gate.kind).toBe('blocked');
		if (gate.kind !== 'blocked') return;
		expect(gate.action).toBe('restart');
	});

	it('blocks official play on an available update and offers a download', () => {
		const gate = selectOfficialAttemptGate({ ...base, isUpdateAvailable: true });

		expect(gate.kind).toBe('blocked');
		if (gate.kind !== 'blocked') return;
		expect(gate.action).toBe('download');
	});

	it('offers nothing to tap while the update is already in flight', () => {
		for (const state of [{ ...base, isDownloading: true }, { ...base, isRestarting: true }]) {
			const gate = selectOfficialAttemptGate({ ...state, isUpdateAvailable: true });

			expect(gate.kind).toBe('blocked');
			if (gate.kind !== 'blocked') continue;
			expect(gate.action).toBe('none');
		}
	});

	// Replaying an old day with a better dictionary is a feature, not unfairness.
	it('never gates replay, whatever the update state', () => {
		const states: OfficialAttemptGateState[] = [
			{ ...base, mode: 'replay', isUpdatePending: true },
			{ ...base, mode: 'replay', isUpdateAvailable: true },
			{ ...base, mode: 'replay', isDownloading: true },
		];

		for (const state of states) expect(selectOfficialAttemptGate(state)).toEqual({ kind: 'open' });
	});

	it('never gates where updates do not exist, so dev builds stay playable', () => {
		expect(selectOfficialAttemptGate({ ...base, enabled: false, isUpdatePending: true })).toEqual({ kind: 'open' });
	});
});
