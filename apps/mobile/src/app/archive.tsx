import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameHeader } from '@/components/game/game-header';
import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import type { DailyArchiveItem } from '@/features/daily/daily-archive-model';
import { DAILY_COPY, type DailyStateCopy } from '@/features/daily/daily-copy';
import { archiveReplayCount } from '@/features/daily/daily-format';
import { useDailyArchive } from '@/features/daily/use-daily-archive';
import { useGameSurface } from '@/hooks/use-game-surface';

const STATUS_STYLE: Record<DailyArchiveItem['statusTone'], { readonly background: string; readonly text: string }> = {
	today: { background: GamePalette.amberLight, text: GamePalette.amberDark },
	missed: { background: GamePalette.primaryLight, text: GamePalette.primaryDark },
	playing: { background: GamePalette.amberLight, text: GamePalette.amberDark },
	completed: { background: GamePalette.successLight, text: GamePalette.successText },
	replay: { background: GamePalette.onPrimaryMuted, text: GamePalette.primaryDark },
};

export default function ArchiveRoute() {
	const surface = useGameSurface();
	const model = useDailyArchive();
	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}> 
			<StatusBar style="auto" />
			<GameHeader title={DAILY_COPY.archive.title} subtitle={DAILY_COPY.archive.headerSubtitle} />
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{model.kind === 'ready' ? <ArchiveList caveat={model.localOnlyCaveat} items={model.items} /> : <StateCard state={model} />}
			</ScrollView>
		</SafeAreaView>
	);
}

function ArchiveList({ caveat, items }: { readonly caveat: string; readonly items: readonly DailyArchiveItem[] }) {
	const surface = useGameSurface();
	return (
		<>
			<View style={[styles.caveatCard, { backgroundColor: surface.card, borderColor: surface.border }]}> 
				<Text style={styles.overline}>{DAILY_COPY.archive.overline}</Text>
				<Text style={[styles.caveatText, { color: surface.textSecondary }]}>{caveat}</Text>
			</View>
			{items.length === 0 ? <StateCard state={DAILY_COPY.state.archiveEmpty} /> : <View style={styles.list}>{items.map((item) => <ArchiveRow key={item.challengeId} item={item} />)}</View>}
		</>
	);
}

function ArchiveRow({ item }: { readonly item: DailyArchiveItem }) {
	const surface = useGameSurface();
	const router = useRouter();
	const status = STATUS_STYLE[item.statusTone];
	return (
		<View style={[styles.row, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<View style={styles.rowHeader}>
				<View style={styles.rowText}>
					<Text style={[styles.rowTitle, { color: surface.text }]}>{item.dateLabel}</Text>
					<Text style={[styles.rowSubtitle, { color: surface.textSecondary }]}>{item.officialLabel}</Text>
				</View>
				<View style={[styles.status, { backgroundColor: status.background }]}>
					<Text style={[styles.statusText, { color: status.text }]}>{item.statusLabel}</Text>
				</View>
			</View>
			<View style={styles.metaGrid}>
				<Meta label={DAILY_COPY.archive.meta.source} value={item.sourceLabel} />
				<Meta label={DAILY_COPY.archive.meta.catalog} value={item.catalogLabel} />
				<Meta label={DAILY_COPY.archive.replay.countLabel} value={archiveReplayCount(item.replayCount)} />
			</View>
			<Pressable
				accessibilityRole="button"
				disabled={!item.canReplay && !item.requiresSubscription}
				onPress={() => router.push(item.requiresSubscription ? '/paywall' : `/daily?challengeId=${item.challengeId}&mode=replay`)}
				style={({ pressed }) => [styles.replayButton, !item.canReplay && !item.requiresSubscription && styles.disabled, pressed && (item.canReplay || item.requiresSubscription) && styles.pressed]}
			>
				<Text style={styles.replayButtonText}>{item.replayLabel}</Text>
			</Pressable>
		</View>
	);
}

function Meta({ label, value }: { readonly label: string; readonly value: string }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.meta, { backgroundColor: surface.tile }]}>
			<Text style={[styles.metaLabel, { color: surface.textTertiary }]}>{label}</Text>
			<Text style={[styles.metaValue, { color: surface.text }]}>{value}</Text>
		</View>
	);
}

function StateCard({ state }: { readonly state: DailyStateCopy }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.caveatCard, { backgroundColor: surface.card, borderColor: surface.border }]}> 
			<Text style={styles.overline}>{state.eyebrow}</Text>
			<Text style={[styles.stateTitle, { color: surface.text }]}>{state.title}</Text>
			<Text style={[styles.caveatText, { color: surface.textSecondary }]}>{state.message}</Text>
			<Text style={[styles.caveatText, { color: surface.textTertiary }]}>{state.detail}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	scroll: { gap: 14, paddingHorizontal: 20, paddingBottom: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
	pressed: { transform: [{ scale: 0.97 }] },
	disabled: { opacity: 0.5 },
	caveatCard: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 20, gap: 8, ...GameShadow.card },
	overline: { fontFamily: GameFonts.body700, fontSize: 12, letterSpacing: 2, color: GamePalette.primary },
	stateTitle: { fontFamily: GameFonts.display800, fontSize: 28, lineHeight: 32 },
	caveatText: { fontFamily: GameFonts.body500, fontSize: 14.5, lineHeight: 21 },
	list: { gap: 12 },
	row: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 16, gap: 12, ...GameShadow.card },
	rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	rowText: { flex: 1, gap: 2 },
	rowTitle: { fontFamily: GameFonts.display700, fontSize: 21 },
	rowSubtitle: { fontFamily: GameFonts.body500, fontSize: 13.5 },
	status: { borderRadius: GameRadius.pill, paddingHorizontal: 10, paddingVertical: 5 },
	statusText: { fontFamily: GameFonts.body700, fontSize: 11.5 },
	metaGrid: { gap: 8 },
	meta: { borderRadius: GameRadius.md, padding: 11, gap: 2 },
	metaLabel: { fontFamily: GameFonts.body700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.8 },
	metaValue: { fontFamily: GameFonts.body600, fontSize: 12.5 },
	replayButton: { minHeight: 46, borderRadius: GameRadius.md, backgroundColor: GamePalette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
	replayButtonText: { fontFamily: GameFonts.display700, fontSize: 16, color: GamePalette.onPrimary },
});
