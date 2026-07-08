import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal, ResultStat } from '@/components/game/result-modal';
import { StatPill } from '@/components/game/stat-pill';
import { GameFonts, GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

import { LetterGrid } from './letter-grid';
import { useParoliereGame, useResultReveal, useSubmitPulse } from './hooks';
import {
	wordPoints,
	type ParoliereService,
	type ParoliereState,
	type SubmitOutcome,
} from './service';

const AMBER_LIGHT = GamePalette.amberLight;

const RULES = [
	{ icon: '✨', text: 'Trascina tra lettere adiacenti' },
	{ icon: '📏', text: 'Minimo 3 lettere per parola' },
	{ icon: '💎', text: 'Paròle lunghe = Più punti' },
] as const;

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ParoliereScreen() {
	const surface = useGameSurface();
	const router = useRouter();
	const { state, service } = useParoliereGame();
	useScreenInteractive();
	const { modalVisible, dismissModal, burst } = useResultReveal(state);

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: surface.background }]} edges={['top', 'bottom']}>
			<GameHeader
				title="Paroliere+"
				subtitle={state.gameState === 'playing' ? 'Sfida a Tempo' : undefined}
				onAction={state.gameState === 'playing' ? service.endGame : undefined}
			/>
			<View style={styles.content}>
				{state.gameState === 'setup' ? (
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

function GameBoard({ state, service }: { state: ParoliereState; service: ParoliereService }) {
	return (
		<Animated.View entering={FadeIn.duration(300)} style={styles.board}>
			<View style={styles.stats}>
				<StatPill
					label="Tempo"
					value={formatTime(state.timeLeft)}
					tone={state.timeLeft < 30 ? 'warning' : 'default'}
				/>
				<StatPill label="Punteggio" value={state.score} tone="accent" />
				<StatPill label="Parole" value={state.foundWords.length} />
			</View>
			<WordDisplay currentWord={state.currentWord} outcome={state.lastOutcome} />
			<LetterGrid grid={state.grid} currentPath={state.currentPath} service={service} />
			{state.foundWords.length > 0 ? <FoundWords words={state.foundWords} /> : null}
		</Animated.View>
	);
}

function WordDisplay({ currentWord, outcome }: { currentWord: string; outcome: SubmitOutcome | null }) {
	const surface = useGameSurface();
	const pulseStyle = useSubmitPulse(outcome);
	const active = currentWord.length > 0;
	return (
		<View
			style={[
				styles.wordDisplay,
				active
					? { backgroundColor: GamePalette.primaryLight, borderColor: GamePalette.primary }
					: { backgroundColor: surface.card, borderColor: surface.border },
			]}
		>
			<Text style={[styles.wordText, { color: active ? GamePalette.primary : surface.textTertiary }]}>
				{currentWord || 'Seleziona le lettere'}
			</Text>
			{outcome ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.pulseOverlay,
						{ backgroundColor: outcome.valid ? GamePalette.success : GamePalette.error },
						pulseStyle,
					]}
				>
					<Text style={styles.pulseText}>
						{outcome.valid ? `${outcome.word} +${wordPoints(outcome.word.length)}` : outcome.word}
					</Text>
				</Animated.View>
			) : null}
		</View>
	);
}

function FoundWords({ words }: { words: string[] }) {
	const surface = useGameSurface();
	const sorted = [...words].sort();
	return (
		<View style={[styles.foundPanel, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<Text style={[styles.foundTitle, { color: surface.textTertiary }]}>Parole Trovate</Text>
			<ScrollView contentContainerStyle={styles.chipWrap}>
				{sorted.map((word) => (
					<Animated.View key={word} entering={ZoomIn.duration(200)} style={styles.chip}>
						<Text style={styles.chipText}>{word}</Text>
					</Animated.View>
				))}
			</ScrollView>
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

	// Game
	board: { flex: 1, alignItems: 'center', padding: 16, gap: 14 },
	stats: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
	wordDisplay: {
		alignSelf: 'stretch',
		height: 58,
		borderRadius: 16,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	wordText: { fontSize: 24, fontFamily: GameFonts.display800, letterSpacing: 2, textTransform: 'uppercase' },
	pulseOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderRadius: 15,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pulseText: { color: '#fff', fontSize: 24, fontFamily: GameFonts.display800, letterSpacing: 2 },
	// Found words
	foundPanel: {
		alignSelf: 'stretch',
		flex: 1,
		minHeight: 84,
		borderRadius: 20,
		borderWidth: 1,
		padding: 16,
	},
	foundTitle: {
		fontSize: 12,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 10,
	},
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		backgroundColor: AMBER_LIGHT,
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	chipText: { color: GamePalette.amberDark, fontSize: 13, fontFamily: GameFonts.body700 },

	// Result modal
	resultStats: { alignSelf: 'stretch', marginTop: 6 },
});
