import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFonts, GamePalette, GameRadius } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

type Props = {
	title: string;
	subtitle?: string;
	/** Right-side action (e.g. new game). Rendered as a circular button. */
	actionLabel?: string;
	actionAccessibilityLabel?: string;
	onAction?: () => void;
};

export function GameHeader({
	title,
	subtitle,
	actionLabel = '↺',
	actionAccessibilityLabel = 'Nuova partita',
	onAction,
}: Props) {
	const router = useRouter();
	const surface = useGameSurface();

	return (
		<View style={styles.header}>
			<Pressable
				accessibilityLabel="Torna alla home"
				onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
				style={({ pressed }) => [
					styles.iconBtn,
					{ backgroundColor: surface.tile },
					pressed && styles.pressed,
				]}
			>
				<Text style={styles.iconText}>‹</Text>
			</Pressable>
			<View style={styles.center}>
				<Text style={[styles.title, { color: surface.text }]}>{title}</Text>
				{subtitle ? (
					<Text style={[styles.subtitle, { color: surface.textTertiary }]}>{subtitle}</Text>
				) : null}
			</View>
			{onAction ? (
				<Pressable
					accessibilityLabel={actionAccessibilityLabel}
					onPress={onAction}
					style={({ pressed }) => [
						styles.iconBtn,
						{ backgroundColor: surface.tile },
						pressed && styles.pressed,
					]}
				>
					<Text style={styles.iconText}>{actionLabel}</Text>
				</Pressable>
			) : (
				<View style={styles.iconBtn} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingHorizontal: 20,
		paddingVertical: 8,
		minHeight: 60,
	},
	iconBtn: {
		width: 44,
		height: 44,
		borderRadius: GameRadius.pill,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
	iconText: {
		fontFamily: GameFonts.display800,
		fontSize: 20,
		lineHeight: 24,
		color: GamePalette.primary,
	},
	center: { alignItems: 'center', flex: 1 },
	title: { fontFamily: GameFonts.display800, fontSize: 22 },
	subtitle: {
		fontFamily: GameFonts.body600,
		fontSize: 11,
		textTransform: 'uppercase',
		letterSpacing: 2,
		marginTop: 1,
	},
});
