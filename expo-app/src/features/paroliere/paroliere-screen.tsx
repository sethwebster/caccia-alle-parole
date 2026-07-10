import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal, ResultStat } from '@/components/game/result-modal';
import { GameFonts, GamePalette } from '@/constants/game-theme';
import { formatPlayModeSubtitle } from '@/features/daily/route-policy';
import type { DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import { parseDailyAdapterSpec } from '@/features/daily/use-daily-game-route-mode';
import { useDailyTerminalRecorder } from '@/features/daily/use-daily-terminal-recorder';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

import { GameBoard } from './paroliere-board';
import { useParoliereGame, useResultReveal } from './hooks';

const RULES = [
	{ icon: '✨', text: 'Trascina tra lettere adiacenti' },
	{ icon: '📏', text: 'Minimo 3 lettere per parola' },
	{ icon: '💎', text: 'Paròle lunghe = Più punti' },
] as const;

export function ParoliereScreen({ routeSession }: { readonly routeSession: DailyGameRouteSession }) {
	const surface = useGameSurface();
	const router = useRouter();
	const challengeConfig = useMemo(() => {
		if (routeSession.challenge === undefined) return undefined;
		const spec = parseDailyAdapterSpec(routeSession.challenge, 'paroliere');
		return {
			context: routeSession.challenge.context,
			grid: spec.payload.grid,
			durationSeconds: spec.payload.durationSeconds,
		};
	}, [routeSession.challenge]);
	const challengeRouteLoading = routeSession.playMode.kind === 'challenge' && routeSession.challenge === undefined;
	const { state, service } = useParoliereGame(challengeConfig);
	useDailyTerminalRecorder(routeSession.challenge, service.getTerminalSummary()?.reason);
	useScreenInteractive();
	const { modalVisible, dismissModal, burst } = useResultReveal(state);

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: surface.background }]} edges={['top', 'bottom']}>
			<GameHeader
				title="Paroliere+"
				subtitle={formatPlayModeSubtitle(routeSession.playMode, state.gameState === 'playing' ? 'Sfida a Tempo' : undefined)}
				onAction={state.gameState === 'playing' ? service.endGame : undefined}
			/>
				<View style={styles.content}>
					{challengeRouteLoading ? (
						<ChallengeLoadingCard />
					) : state.gameState === 'setup' ? (
						<SetupCard onStart={service.startGame} />
					) : (
					<GameBoard state={state} service={service} />
				)}
			</View>
			<Confetti burst={burst} />
			<ResultModal
				visible={modalVisible}
				icon="🏆"
				title="Partita Finita!"
				primaryLabel="Gioca Ancora"
				onPrimary={() => {
					dismissModal();
					service.startGame();
				}}
				secondaryLabel="Torna al Menu"
				onSecondary={() => {
					dismissModal();
					router.replace('/');
				}}
				onDismiss={dismissModal}
			>
				<View style={styles.resultStats}>
					<ResultStat label="Punteggio" value={state.score} accent />
					<ResultStat label="Parole" value={state.foundWords.length} />
				</View>
			</ResultModal>
		</SafeAreaView>
	);
}

function ChallengeLoadingCard() {
	const surface = useGameSurface();
	return (
		<View style={styles.setupWrap}>
			<View style={[styles.setupCard, { backgroundColor: surface.card, borderColor: surface.border }]}>
				<Text style={styles.setupIcon}>🎭</Text>
				<Text style={[styles.setupTitle, { color: surface.text }]}>Prepariamo la sfida</Text>
				<Text style={[styles.setupDesc, { color: surface.textSecondary }]}>Caricamento del tentativo ufficiale in corso.</Text>
			</View>
		</View>
	);
}

function SetupCard({ onStart }: { onStart: () => void }) {
	const surface = useGameSurface();
	return (
		<View style={styles.setupWrap}>
			<Animated.View
				entering={FadeInDown.duration(500)}
				style={[styles.setupCard, { backgroundColor: surface.card, borderColor: surface.border }]}
			>
				<Text style={styles.setupIcon}>🎭</Text>
				<Text style={[styles.setupTitle, { color: surface.text }]}>Pronto per la Sfida?</Text>
				<Text style={[styles.setupDesc, { color: surface.textSecondary }]}>
					Trova più parole possibili collegando le lettere adiacenti in 3 minuti.
				</Text>
				<View style={[styles.rulesBox, { backgroundColor: surface.tile }]}>
					{RULES.map((rule) => (
						<View key={rule.icon} style={styles.ruleRow}>
							<Text style={styles.ruleIcon}>{rule.icon}</Text>
							<Text style={[styles.ruleText, { color: surface.text }]}>{rule.text}</Text>
						</View>
					))}
				</View>
				<Pressable onPress={onStart} style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}>
					<Text style={styles.startText}>Inizia Partita</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	content: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },

	// Setup
	setupWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
	setupCard: {
		width: '100%',
		maxWidth: 400,
		borderRadius: 32,
		borderWidth: 1,
		padding: 32,
		alignItems: 'center',
	},
	setupIcon: { fontSize: 52, marginBottom: 18 },
	setupTitle: { fontSize: 26, fontFamily: GameFonts.display800, marginBottom: 10, textAlign: 'center' },
	setupDesc: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
	rulesBox: { alignSelf: 'stretch', borderRadius: 20, padding: 18, gap: 12, marginBottom: 24 },
	ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	ruleIcon: { fontSize: 20 },
	ruleText: { fontSize: 14, fontFamily: GameFonts.body600, flexShrink: 1 },
	startBtn: {
		alignSelf: 'stretch',
		backgroundColor: GamePalette.primary,
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
	},
	startText: { color: '#fff', fontSize: 17, fontFamily: GameFonts.display700 },
	pressed: { opacity: 0.75 },

	resultStats: { alignSelf: 'stretch', marginTop: 6 },
});
