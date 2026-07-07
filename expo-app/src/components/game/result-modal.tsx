import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

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
					entering={ZoomIn.springify().damping(16)}
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
		backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
	},
	icon: { fontSize: 56, marginBottom: 10 },
	title: { fontSize: 26, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
	message: { fontSize: 15, textAlign: 'center', marginBottom: 14 },
	buttons: { alignSelf: 'stretch', marginTop: 18, gap: 10 },
	primaryBtn: {
		backgroundColor: GamePalette.primary,
		paddingVertical: 15,
		borderRadius: 14,
		alignItems: 'center',
	},
	primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
	ghostBtn: { paddingVertical: 10, alignItems: 'center' },
	ghostText: { fontWeight: '700', fontSize: 14 },
	pressed: { opacity: 0.75 },
	statRow: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 9,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	statLabel: { fontSize: 14, fontWeight: '600' },
	statValue: { fontSize: 16, fontWeight: '800' },
});
