import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ParoliereService, type ParoliereChallengeConfig, type ParoliereState, type SubmitOutcome } from './service';

/** Owns a per-mount service instance and subscribes the screen to its state. */
export function useParoliereGame(challenge?: ParoliereChallengeConfig): { state: ParoliereState; service: ParoliereService } {
	const service = useMemo(() => new ParoliereService({ challenge }), [challenge]);
	const state = useSyncExternalStore(service.subscribe, service.getState, service.getState);
	useServiceTeardown(service);
	return { state, service };
}

/** Stops the countdown and ends the Live Activity when the screen unmounts. */
function useServiceTeardown(service: ParoliereService): void {
	useEffect(() => () => service.destroy(), [service]);
}

/**
 * One-shot result reveal: when a round finishes, fire confetti for big
 * scores and open the modal ~1400ms later (confetti volley plays out first).
 * The guard resets on a new round; dismissing never re-opens the modal,
 * and the pending timeout is cleared so a new round can't pop a stale one.
 */
export function useResultReveal(state: ParoliereState): {
	modalVisible: boolean;
	dismissModal: () => void;
	burst: number;
} {
	const [modalVisible, setModalVisible] = useState(false);
	const shownRef = useRef(false);
	const finished = state.gameState === 'finished';
	const { score } = state;
	const burst = finished && score > 20 ? score : 0;

	useEffect(() => {
		if (!finished) {
			shownRef.current = false;
			const timeout = setTimeout(() => setModalVisible(false), 0);
			return () => clearTimeout(timeout);
		}
		if (shownRef.current) return;
		shownRef.current = true;
		const timeout = setTimeout(() => setModalVisible(true), 1400);
		return () => clearTimeout(timeout);
	}, [finished]);

	const dismissModal = useCallback(() => setModalVisible(false), []);

	return { modalVisible, dismissModal, burst };
}

/** Brief green/red flash after each submit; returns the overlay's animated style. */
export function useSubmitPulse(outcome: SubmitOutcome | null) {
	const progress = useSharedValue(0);
	useEffect(() => {
		if (!outcome) return;
		progress.value = 1;
		progress.value = withDelay(250, withTiming(0, { duration: 450 }));
	}, [outcome, progress]);
	return useAnimatedStyle(() => ({ opacity: progress.value }));
}
