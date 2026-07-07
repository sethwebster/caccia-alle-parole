import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

// Kit's --ease-out over --duration-med: settles without spring overshoot.
const cardIn = new Keyframe({
	0: { opacity: 0, transform: [{ scale: 0.92 }] },
	100: {
		opacity: 1,
		transform: [{ scale: 1 }],
		easing: Easing.bezier(0.22, 1, 0.36, 1).factory(),
	},
}).duration(240);

type Props = {
	visible: boolean;
	icon: string;
	title: string;
	message?: string;
	children?: ReactNode;
	primaryLabel: string;
	onPrimary: () => void;
	secondaryLabel?: string;
	onSecondary?: () => void;
	/** Backdrop tap / hardware back. */
	onDismiss: () => void;
};

export function ResultModal({
	visible,
	icon,
	title,
	message,
	children,
	primaryLabel,
	onPrimary,
	secondaryLabel,
	onSecondary,
	onDismiss,
}: Props) {
	const surface = useGameSurface();

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
			<Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Chiudi risultato" />
				<Animated.View
					entering={cardIn}
					style={[styles.card, { backgroundColor: surface.card }]}
				>
					<Text style={styles.icon}>{icon}</Text>
					<Text style={[styles.title, { color: surface.text }]}>{title}</Text>
					{message ? <Text style={[styles.message, { color: surface.textSecondary }]}>{message}</Text> : null}
					{children}
					<View style={styles.buttons}>
						<Pressable
							onPress={onPrimary}
							style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
						>
							<Text style={styles.primaryText}>{primaryLabel}</Text>
						</Pressable>
						{secondaryLabel && onSecondary ? (
							<Pressable onPress={onSecondary} style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
								<Text style={[styles.ghostText, { color: surface.textTertiary }]}>{secondaryLabel}</Text>
							</Pressable>
						) : null}
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
}

/** Row inside the results card: label on the left, value on the right. */
export function ResultStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.statRow, { borderBottomColor: surface.border }]}>
			<Text style={[styles.statLabel, { color: surface.textSecondary }]}>{label}</Text>
			<Text style={[styles.statValue, { color: accent ? GamePalette.success : surface.text }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(67, 36, 27, 0.55)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	card: {
		width: '100%',
		maxWidth: 400,
		borderRadius: 28,
		paddingVertical: 32,
		paddingHorizontal: 26,
		alignItems: 'center',
		...GameShadow.raised,
	},
	icon: { fontSize: 56, marginBottom: 10 },
	title: { fontFamily: GameFonts.display800, fontSize: 26, marginBottom: 6, textAlign: 'center' },
	message: { fontFamily: GameFonts.body500, fontSize: 15, textAlign: 'center', marginBottom: 14 },
	buttons: { alignSelf: 'stretch', marginTop: 18, gap: 10 },
	primaryBtn: {
		backgroundColor: GamePalette.primary,
		height: 48,
		borderRadius: GameRadius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryText: { color: GamePalette.onPrimary, fontFamily: GameFonts.display700, fontSize: 17 },
	ghostBtn: { paddingVertical: 10, alignItems: 'center' },
	ghostText: { fontFamily: GameFonts.body700, fontSize: 14 },
	pressed: { opacity: 0.75 },
	statRow: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 9,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	statLabel: { fontFamily: GameFonts.body600, fontSize: 14 },
	statValue: { fontFamily: GameFonts.display700, fontSize: 16 },
});
