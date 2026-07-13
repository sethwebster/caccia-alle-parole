import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameHeader } from '@/components/game/game-header';
import { PaywallLocaleToggle } from '@/components/subscription/paywall-locale-toggle';
import { DAILY_COPY, type DailyStateCopy } from '@/features/daily/daily-copy';
import { usePaywallLocale } from '@/features/subscription/paywall-locale';
import { GATE_COPY } from '@/features/subscription/subscription-copy';
import { ACTIVE_PUZZLE_BORDER_COLOR, STATE_TONE_COLORS, STATUS_COLORS, styles } from '@/features/daily/daily-route.styles';
import type { DailyRoutePuzzleModel, DailyRouteReadyModel } from '@/features/daily/daily-route-model';
import { DailyThemeCard } from '@/features/daily/daily-theme-card';
import { DAILY_HOME_ROUTE } from '@/features/daily/route-policy';
import { useDailyRouteController } from '@/features/daily/use-daily-route-controller';
import { useGameSurface } from '@/hooks/use-game-surface';

export default function DailyRoute() {
	const surface = useGameSurface();
	const { model, actions } = useDailyRouteController();

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}> 
			<StatusBar style="auto" />
			<GameHeader title={DAILY_HOME_ROUTE.title} subtitle={DAILY_COPY.route.headerSubtitle} />
				<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
					{model.kind === 'ready' ? (
							<ReadyContent model={model} onLaunchCurrent={actions.launchCurrent} onLaunchPuzzle={actions.launchPuzzle} onGiveUp={actions.giveUpActive} onShare={actions.shareResult} onAnswerTheme={actions.answerTheme} />
					) : model.kind === 'subscriptionRequired' ? (
						<SubscriptionRequiredCard />
					) : (
						<StateCard state={model} />
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function ReadyContent({
	model,
	onLaunchCurrent,
	onLaunchPuzzle,
	onGiveUp,
	onShare,
	onAnswerTheme,
}: {
	readonly model: DailyRouteReadyModel;
	readonly onLaunchCurrent: () => void;
	readonly onLaunchPuzzle: (puzzle: DailyRoutePuzzleModel) => void;
	readonly onGiveUp: () => void;
	readonly onShare: () => void;
	readonly onAnswerTheme: (answerIndex: number) => void;
}) {
	return (
		<>
			<HeroCard model={model} onLaunchCurrent={onLaunchCurrent} onGiveUp={onGiveUp} />
			<ResultCard model={model} onShare={onShare} />
				<DailyThemeCard model={model} onAnswerTheme={onAnswerTheme} />
			<View style={styles.list}>
				{model.puzzles.map((puzzle) => (
					<PuzzleRow key={puzzle.key} puzzle={puzzle} active={puzzle.key === model.activePuzzleKey} onPress={() => onLaunchPuzzle(puzzle)} onGiveUp={onGiveUp} />
				))}
			</View>
			<CatalogCard model={model} />
		</>
	);
}

function ResultCard({ model, onShare }: { readonly model: DailyRouteReadyModel; readonly onShare: () => void }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.card, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<Text style={styles.sectionOverline}>{DAILY_COPY.route.resultOverline}</Text>
			<Text style={[styles.cardTitle, { color: surface.text }]}>{model.share.title}</Text>
			<Text style={[styles.copy, { color: surface.textSecondary }]}>{model.share.body}</Text>
			<View style={styles.metaGrid}>
				<Meta label={DAILY_COPY.route.stats.streak} value={`${model.stats.currentStreak}`} />
				<Meta label={DAILY_COPY.route.stats.completed} value={`${model.stats.completedOfficialChallenges}`} />
				<Meta label={DAILY_COPY.route.stats.perfect} value={`${model.stats.perfectOfficialChallenges}`} />
			</View>
			<Pressable accessibilityRole="button" disabled={model.share.kind !== 'available'} onPress={onShare} style={({ pressed }) => [styles.secondaryButton, model.share.kind !== 'available' && styles.disabled, pressed && styles.pressed]}>
				<Text style={styles.secondaryButtonText}>{model.share.buttonLabel}</Text>
			</Pressable>
		</View>
	);
}

function HeroCard({ model, onLaunchCurrent, onGiveUp }: { readonly model: DailyRouteReadyModel; readonly onLaunchCurrent: () => void; readonly onGiveUp: () => void }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.heroCard, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<View style={styles.heroTopRow}>
				<View style={styles.heroText}>
					<Text style={styles.overline}>{DAILY_HOME_ROUTE.overline}</Text>
					<Text style={[styles.title, { color: surface.text }]}>{model.dateLabel}</Text>
					<Text style={[styles.copy, { color: surface.textSecondary }]}>{model.phaseLabel}</Text>
				</View>
				<View style={styles.progressBadge}>
					<Text style={styles.progressBadgeText}>{model.progressLabel}</Text>
				</View>
			</View>
			<ProgressBar value={model.progressValue} max={model.progressMax} />
			<View style={styles.actionRow}>
				<Pressable accessibilityRole="button" disabled={model.currentPuzzleHref === undefined} onPress={onLaunchCurrent} style={({ pressed }) => [styles.primaryButton, model.currentPuzzleHref === undefined && styles.disabled, pressed && styles.pressed]}>
					<Text style={styles.primaryButtonText}>{model.currentActionLabel}</Text>
				</Pressable>
				{model.canGiveUp ? (
					<Pressable accessibilityRole="button" onPress={onGiveUp} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
						<Text style={styles.secondaryButtonText}>{DAILY_COPY.route.giveUp}</Text>
					</Pressable>
				) : null}
			</View>
			{model.replayBadge ? <Text style={styles.replayBadge}>{model.replayBadge}</Text> : null}
		</View>
	);
}

function ProgressBar({ value, max }: { readonly value: number; readonly max: number }) {
	const surface = useGameSurface();
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	return (
		<View style={[styles.progressTrack, { backgroundColor: surface.tile }]}>
			<View style={[styles.progressFill, { width: `${pct}%` }]} />
		</View>
	);
}

function PuzzleRow({ puzzle, active, onPress, onGiveUp }: { readonly puzzle: DailyRoutePuzzleModel; readonly active: boolean; readonly onPress: () => void; readonly onGiveUp: () => void }) {
	const surface = useGameSurface();
	const status = STATUS_COLORS[puzzle.statusTone];
	return (
		<View style={[styles.row, { backgroundColor: surface.card, borderColor: active ? ACTIVE_PUZZLE_BORDER_COLOR : surface.border }]}> 
			<Pressable accessibilityRole="link" disabled={!puzzle.canLaunch} onPress={onPress} style={({ pressed }) => [styles.rowPressable, pressed && puzzle.canLaunch && styles.pressed, !puzzle.canLaunch && styles.completedRow]}>
				<View style={[styles.icon, { backgroundColor: surface.tile }]}>
					<Text style={styles.iconText}>{puzzle.icon}</Text>
				</View>
				<View style={styles.rowText}>
					<View style={styles.rowTitleLine}>
						<Text style={[styles.rowTitle, { color: surface.text }]}>{puzzle.label}</Text>
						<View style={[styles.statusPill, { backgroundColor: status.background }]}>
							<Text style={[styles.statusText, { color: status.text }]}>{puzzle.statusLabel}</Text>
						</View>
					</View>
					<Text style={[styles.rowSubtitle, { color: surface.textSecondary }]}>{puzzle.subtitle}</Text>
				</View>
			</Pressable>
			{active ? (
				<Pressable accessibilityRole="button" onPress={onGiveUp} style={({ pressed }) => [styles.rowGiveUp, pressed && styles.pressed]}>
					<Text style={styles.rowGiveUpText}>{DAILY_COPY.route.giveUp}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

function CatalogCard({ model }: { readonly model: DailyRouteReadyModel }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.card, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<Text style={styles.sectionOverline}>{DAILY_COPY.route.catalogOverline}</Text>
			<View style={styles.metaGrid}>
				<Meta label={DAILY_COPY.route.catalogMeta.version} value={model.catalog.versionLabel} />
				<Meta label={DAILY_COPY.route.catalogMeta.source} value={model.catalog.sourceLabel} />
				<Meta label={DAILY_COPY.route.catalogMeta.window} value={model.catalog.supportLabel} />
			</View>
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

function SubscriptionRequiredCard() {
	const router = useRouter();
	const { locale } = usePaywallLocale();
	const copy = GATE_COPY[locale];
	return (
		<>
			<PaywallLocaleToggle />
			<StateCard state={{ ...copy, tone: 'warning' }} />
			<Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
				<Text style={styles.primaryButtonText}>{copy.cta}</Text>
			</Pressable>
		</>
	);
}

function StateCard({ state }: { readonly state: DailyStateCopy }) {
	const surface = useGameSurface();
	const tone = STATE_TONE_COLORS[state.tone];
	return (
		<View style={[styles.stateCard, { backgroundColor: surface.card, borderColor: surface.border }]}> 
			<View style={[styles.stateTone, { backgroundColor: tone.background }]}>
				<Text style={[styles.stateToneText, { color: tone.text }]}>{state.eyebrow}</Text>
			</View>
			<View style={[styles.stateAccent, { backgroundColor: tone.accent }]} />
			<Text style={[styles.title, { color: surface.text }]}>{state.title}</Text>
			<Text style={[styles.copy, { color: surface.textSecondary }]}>{state.message}</Text>
			<Text style={[styles.copy, { color: surface.textTertiary }]}>{state.detail}</Text>
		</View>
	);
}
