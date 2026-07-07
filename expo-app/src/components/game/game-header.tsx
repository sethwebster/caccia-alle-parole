import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
		<View style={[styles.header, { backgroundColor: surface.card, borderBottomColor: surface.border }]}>
			<Pressable
				accessibilityLabel="Torna alla home"
				onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
				style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: surface.tile }]}
			>
				<Text style={[styles.iconText, { color: surface.textSecondary }]}>‹</Text>
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
					style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: surface.tile }]}
				>
					<Text style={[styles.iconText, { color: surface.textSecondary }]}>{actionLabel}</Text>
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
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	iconBtn: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: { fontSize: 26, fontWeight: '700', lineHeight: 28 },
	center: { alignItems: 'center', flex: 1 },
	title: { fontSize: 19, fontWeight: '800' },
	subtitle: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginTop: 1,
	},
});
