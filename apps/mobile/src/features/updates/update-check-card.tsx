import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

import { UPDATE_CHECK_COPY } from './update-prompt-model';
import { useUpdateCheck } from './use-update-check';

/** Profile row for pulling an update on demand instead of waiting for the next launch check. */
export function UpdateCheckCard() {
	const surface = useGameSurface();
	const { enabled, model, check } = useUpdateCheck();
	if (!enabled) return null;

	return (
		<View style={[styles.card, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<Text style={styles.overline}>{UPDATE_CHECK_COPY.overline}</Text>
			<Text style={[styles.title, { color: surface.text }]}>{UPDATE_CHECK_COPY.title}</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={UPDATE_CHECK_COPY.action}
				accessibilityState={{ busy: model.busy, disabled: model.busy }}
				disabled={model.busy}
				onPress={check}
				style={({ pressed }) => [styles.action, { backgroundColor: surface.tile }, pressed && styles.pressed]}
			>
				<Text style={styles.actionText}>{model.label}</Text>
			</Pressable>
			{model.caption === undefined ? null : (
				<Text style={[styles.caption, { color: surface.textSecondary }]}>{model.caption}</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	card: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 18, gap: 12, ...GameShadow.card },
	overline: { fontFamily: GameFonts.body700, fontSize: 11.5, letterSpacing: 1.6, color: GamePalette.primary },
	title: { fontFamily: GameFonts.display700, fontSize: 19 },
	action: {
		minHeight: 44,
		borderRadius: GameRadius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	actionText: { fontFamily: GameFonts.body700, fontSize: 14.5, color: GamePalette.primary },
	caption: { fontFamily: GameFonts.body500, fontSize: 13, textAlign: 'center' },
	pressed: { transform: [{ scale: 0.97 }] },
});
