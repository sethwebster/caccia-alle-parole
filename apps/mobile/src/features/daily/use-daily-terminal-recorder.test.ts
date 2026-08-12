import { describe, expect, it, vi } from 'vitest';

import type { DailyGameChallengeRoute } from './use-daily-game-route-mode';
import { DailyTerminalRecordCoordinator } from './use-daily-terminal-recorder';

describe('daily terminal completion coordination', () => {
	it('waits for the first terminal write before leaving the puzzle', async () => {
		let accept!: () => void;
		const pending = new Promise<void>((resolve) => {
			accept = resolve;
		});
		const recordTerminal = vi.fn(async () => {
			await pending;
			return { kind: 'accepted' } as const;
		});
		const challenge = {
			context: { terminalEventId: 'terminal-1' },
			recordTerminal,
		} as unknown as DailyGameChallengeRoute;
		const coordinator = new DailyTerminalRecordCoordinator();
		const leavePuzzle = vi.fn();

		void coordinator.record(challenge, 'win');
		const completion = coordinator.complete(leavePuzzle);

		expect(recordTerminal).toHaveBeenCalledTimes(1);
		expect(leavePuzzle).not.toHaveBeenCalled();
		accept();
		await completion;
		expect(leavePuzzle).toHaveBeenCalledTimes(1);
	});

	it('deduplicates repeated terminal renders for the same attempt', async () => {
		const recordTerminal = vi.fn(async () => ({ kind: 'accepted' }) as const);
		const challenge = {
			context: { terminalEventId: 'terminal-1' },
			recordTerminal,
		} as unknown as DailyGameChallengeRoute;
		const coordinator = new DailyTerminalRecordCoordinator();

		await Promise.all([
			coordinator.record(challenge, 'win'),
			coordinator.record(challenge, 'win'),
		]);

		expect(recordTerminal).toHaveBeenCalledTimes(1);
	});
});
