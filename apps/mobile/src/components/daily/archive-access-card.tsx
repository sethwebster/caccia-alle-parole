import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFonts, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

export function ArchiveAccessCard({ compact = false }: { readonly compact?: boolean }) {
	const surface = useGameSurface();
	const router = useRouter();
	return (
		<Pressable accessibilityRole="link" onPress={() => router.push('../archive')} style={({ pressed }) => [styles.card, compact && styles.compact, { backgroundColor: surface.card, borderColor: surface.border }, pressed && styles.pressed]}>
			<View style={[styles.icon, { backgroundColor: surface.tile }]}>
				<Text style={styles.iconText}>🗓️</Text>
			</View>
			<View style={styles.textBlock}>
				<Text style={[styles.title, { color: surface.text }]}>Archivio Sfide</Text>
				<Text style={[styles.subtitle, { color: surface.textTertiary }]}>Storico locale, replay e sfide mancate</Text>
			</View>
			<Text style={[styles.action, { color: surface.textSecondary }]}>Apri</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: GameRadius.md, paddingVertical: 11, paddingHorizontal: 13, ...GameShadow.subtle },
	compact: { paddingVertical: 9 },
	pressed: { transform: [{ scale: 0.97 }] },
	icon: { width: 34, height: 34, borderRadius: GameRadius.sm, alignItems: 'center', justifyContent: 'center' },
	iconText: { fontSize: 17 },
	textBlock: { flex: 1, gap: 2, minWidth: 0 },
	title: { fontFamily: GameFonts.body700, fontSize: 14.5 },
	subtitle: { fontFamily: GameFonts.body500, fontSize: 12.5 },
	action: { fontFamily: GameFonts.body600, fontSize: 12 },
});
