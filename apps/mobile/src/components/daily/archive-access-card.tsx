import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

export function ArchiveAccessCard({ compact = false }: { readonly compact?: boolean }) {
	const surface = useGameSurface();
	const router = useRouter();
	return (
		<Pressable accessibilityRole="link" onPress={() => router.push('../archive')} style={({ pressed }) => [styles.card, compact && styles.compact, { backgroundColor: surface.card }, pressed && styles.pressed]}>
			<View style={[styles.icon, { backgroundColor: surface.tile }]}>
				<Text style={styles.iconText}>🗓️</Text>
			</View>
			<View style={styles.textBlock}>
				<Text style={[styles.title, { color: surface.text }]}>Archivio Sfide</Text>
				<Text style={[styles.subtitle, { color: surface.textSecondary }]}>Storico locale, replay e sfide mancate</Text>
			</View>
			<Text style={styles.action}>Apri</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: GameRadius.lg, paddingVertical: 16, paddingHorizontal: 18, ...GameShadow.card },
	compact: { paddingVertical: 14 },
	pressed: { transform: [{ scale: 0.97 }] },
	icon: { width: 48, height: 48, borderRadius: GameRadius.tile, alignItems: 'center', justifyContent: 'center' },
	iconText: { fontSize: 24 },
	textBlock: { flex: 1, gap: 2, minWidth: 0 },
	title: { fontFamily: GameFonts.display700, fontSize: 20 },
	subtitle: { fontFamily: GameFonts.body500, fontSize: 13.5 },
	action: { fontFamily: GameFonts.body700, fontSize: 13, color: GamePalette.primary },
});
