import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	FadeInDown,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
	ZoomIn,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal, ResultStat } from '@/components/game/result-modal';
import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';
import type { KeyboardState, LetterResult, Word, WordleState } from '@/lib/types';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

import { MAX_GUESSES } from './parola-logic';
import { useParolaGame } from './use-parola-game';

const KEYBOARD_ROWS = [
	['Q', 'E', 'R', 'T', 'U', 'I', 'O', 'P'],
	['A', 'S', 'D', 'F', 'G', 'H', 'L'],
	['ENTER', 'Z', 'C', 'V', 'B', 'N', 'M', '⌫'],
] as const;

const COLUMNS = [0, 1, 2, 3, 4] as const;
const FLIP_MS = 500;
const FLIP_STAGGER_MS = 150;

const STATUS_COLORS: Record<LetterResult['status'], string> = {
	correct: GamePalette.success,
	present: GamePalette.amber,
	absent: GamePalette.absent,
};

const DAILY_CAPTION = `La parola del giorno · ${new Date().toLocaleDateString('it-IT', {
	day: 'numeric',
	month: 'long',
})}`;

export function ParolaScreen() {
	const surface = useGameSurface();
	const game = useParolaGame();
	useScreenInteractive(game.hydrated);
	const won = game.state.gameState === 'won';
	const [showHelp, setShowHelp] = useState(false);

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}>
			<GameHeader
				title="Paròle"
				subtitle={`Puzzle ${game.puzzleNumber}`}
				actionLabel="?"
				actionAccessibilityLabel="Come giocare"
				onAction={() => setShowHelp(true)}
			/>
			<View style={styles.content}>
				{game.hydrated ? (
					<>
						<View style={styles.boardArea}>
							<Board state={game.state} />
							<Text style={[styles.dailyCaption, { color: surface.textTertiary }]}>{DAILY_CAPTION}</Text>
							{game.toast ? <ToastBanner key={game.toast.id} message={game.toast.message} /> : null}
						</View>
						<KeyboardPanel keyboardState={game.state.keyboardState} onKey={game.onKey} />
					</>
				) : null}
			</View>
			<Confetti burst={game.burst} />
			<ResultModal
				visible={game.modalVisible}
				icon={won ? '🏆' : '🎭'}
				title={won ? 'Bravo!' : 'Riprova domani'}
				primaryLabel={game.copied ? 'Copiato!' : 'Condividi Risultato'}
				onPrimary={game.share}
				secondaryLabel="Chiudi"
				onSecondary={game.dismissModal}
				onDismiss={game.dismissModal}
			>
				<TargetCard word={game.state.targetWord} data={game.state.targetWordData} />
				<View style={styles.stats}>
					<ResultStat label="Tentativi" value={won ? game.state.guesses.length : 'X'} accent={won} />
					<ResultStat label="Serie di vittorie" value={game.streak} />
				</View>
			</ResultModal>
			<ResultModal
				visible={showHelp}
				icon="💡"
				title="Come Giocare"
				primaryLabel="Ho capito!"
				onPrimary={() => setShowHelp(false)}
				onDismiss={() => setShowHelp(false)}
			>
				<HowToPlay />
			</ResultModal>
		</SafeAreaView>
	);
}

function HowToPlay() {
	const surface = useGameSurface();
	const example = ['C', 'A', 'N', 'E', 'S'] as const;
	return (
		<View style={styles.howTo}>
			<Text style={[styles.howToText, { color: surface.textSecondary }]}>
				Indovina la <Text style={styles.howToBold}>PAROLA</Text> in {MAX_GUESSES} tentativi.
			</Text>
			<Text style={[styles.howToText, { color: surface.textSecondary }]}>
				• Ogni tentativo deve essere di 5 lettere.
			</Text>
			<Text style={[styles.howToText, { color: surface.textSecondary }]}>
				• Il colore delle tessere cambierà per mostrare quanto sei vicino.
			</Text>
			<View style={[styles.exampleBox, { backgroundColor: surface.tile, borderColor: surface.border }]}>
				<View style={styles.exampleRow}>
					{example.map((letter, i) => (
						<View
							key={i}
							style={[
								styles.miniTile,
								i === 0
									? { backgroundColor: GamePalette.success, borderColor: GamePalette.success }
									: { backgroundColor: surface.card, borderColor: surface.border },
							]}
						>
							<Text style={[styles.miniTileText, { color: i === 0 ? '#ffffff' : surface.text }]}>
								{letter}
							</Text>
						</View>
					))}
				</View>
				<Text style={[styles.howToText, { color: surface.textSecondary }]}>
					La lettera <Text style={styles.howToBold}>C</Text> è nella parola e nel posto giusto.
				</Text>
			</View>
		</View>
	);
}

function Board({ state }: { state: WordleState }) {
	const emptyRows = Math.max(
		0,
		MAX_GUESSES - state.guesses.length - (state.gameState === 'playing' ? 1 : 0),
	);
	return (
		<View style={styles.board}>
			{state.guesses.map((guess, rowIndex) => (
				<View key={rowIndex} style={styles.row}>
					{guess.result.map((letter, colIndex) => (
						<EvaluatedTile key={colIndex} result={letter} delayMs={colIndex * FLIP_STAGGER_MS} />
					))}
				</View>
			))}
			{state.gameState === 'playing' ? <ActiveRow currentGuess={state.currentGuess} /> : null}
			{Array.from({ length: emptyRows }, (_, i) => (
				<EmptyRow key={i} />
			))}
		</View>
	);
}

/** Drives the reveal flip: 0→1 once on mount, staggered per column. */
function useFlipProgress(delayMs: number) {
	const progress = useSharedValue(0);
	useEffect(() => {
		progress.value = withDelay(
			delayMs,
			withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.quad) }),
		);
	}, [delayMs, progress]);
	return progress;
}

function EvaluatedTile({ result, delayMs }: { result: LetterResult; delayMs: number }) {
	const surface = useGameSurface();
	const progress = useFlipProgress(delayMs);
	const statusColor = STATUS_COLORS[result.status];
	const front = surface.card;
	const frontBorder = surface.border;
	const frontText = surface.text;

	// Fold up to 90°, swap face color, fold back down.
	const tileStyle = useAnimatedStyle(() => {
		const revealed = progress.value >= 0.5;
		const angle = revealed ? (1 - progress.value) * 180 : progress.value * 180;
		return {
			transform: [{ rotateX: `${angle}deg` }],
			backgroundColor: revealed ? statusColor : front,
			borderColor: revealed ? statusColor : frontBorder,
		};
	});
	const textStyle = useAnimatedStyle(() => ({
		color: progress.value >= 0.5 ? '#ffffff' : frontText,
	}));

	return (
		<Animated.View style={[styles.tile, tileStyle]}>
			<Animated.Text style={[styles.tileText, textStyle]}>{result.letter}</Animated.Text>
		</Animated.View>
	);
}

function ActiveRow({ currentGuess }: { currentGuess: string }) {
	const surface = useGameSurface();
	return (
		<View style={styles.row}>
			{COLUMNS.map((i) => {
				const letter = currentGuess[i] ?? '';
				return (
					<View
						key={i}
						style={[
							styles.tile,
							{
								backgroundColor: surface.card,
								borderColor: letter ? surface.textSecondary : surface.border,
							},
						]}
					>
						{letter ? (
							<Animated.Text
								entering={ZoomIn.duration(120)}
								style={[styles.tileText, { color: surface.text }]}
							>
								{letter}
							</Animated.Text>
						) : null}
					</View>
				);
			})}
		</View>
	);
}

function EmptyRow() {
	const surface = useGameSurface();
	return (
		<View style={styles.row}>
			{COLUMNS.map((i) => (
				<View
					key={i}
					style={[styles.tile, { backgroundColor: surface.card, borderColor: surface.border }]}
				/>
			))}
		</View>
	);
}

function KeyboardPanel({
	keyboardState,
	onKey,
}: {
	keyboardState: KeyboardState;
	onKey: (key: string) => void;
}) {
	return (
		<View style={styles.keyboard}>
			{KEYBOARD_ROWS.map((row, i) => (
				<View key={i} style={styles.kbRow}>
					{row.map((key) => (
						<Key key={key} label={key} status={keyboardState[key]} onPress={onKey} />
					))}
				</View>
			))}
		</View>
	);
}

function Key({
	label,
	status,
	onPress,
}: {
	label: string;
	status?: KeyboardState[string];
	onPress: (key: string) => void;
}) {
	const surface = useGameSurface();
	const colored = status !== undefined && status !== 'empty';
	const wide = label.length > 1;
	const display = label === 'ENTER' ? 'INVIO' : label;
	return (
		<Pressable
			accessibilityLabel={label === '⌫' ? 'Cancella' : label === 'ENTER' ? 'Invio' : label}
			onPress={() => onPress(label)}
			style={({ pressed }) => [
				styles.key,
				wide && styles.keyWide,
				{ backgroundColor: colored ? STATUS_COLORS[status] : surface.card },
				pressed && styles.keyPressed,
			]}
		>
			{label === '⌫' ? (
				// Baloo 2 lacks U+232B; the system-font fallback looks thin next to the letter keys.
				<SymbolView
					name={{ ios: 'delete.left.fill', android: 'backspace', web: 'backspace' }}
					size={19}
					tintColor={colored ? '#ffffff' : surface.text}
				/>
			) : (
				<Text style={[styles.keyText, wide && styles.keyTextWide, { color: colored ? '#ffffff' : surface.text }]}>
					{display}
				</Text>
			)}
		</Pressable>
	);
}

function ToastBanner({ message }: { message: string }) {
	return (
		<Animated.View
			entering={FadeInDown.duration(150)}
			exiting={FadeOut.duration(200)}
			pointerEvents="none"
			style={styles.toast}
		>
			<Text style={styles.toastText}>{message}</Text>
		</Animated.View>
	);
}

function TargetCard({ word, data }: { word: string; data: Word }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.targetCard, { backgroundColor: surface.tile, borderColor: surface.border }]}>
			<Text style={[styles.targetLabel, { color: surface.textTertiary }]}>La parola era</Text>
			<Text style={[styles.targetWord, { color: GamePalette.primary }]}>{word}</Text>
			<Text style={[styles.targetTranslation, { color: surface.textSecondary }]}>{data.translation}</Text>
			<Text style={[styles.targetDefinition, { color: surface.textTertiary }]}>{`"${data.definition}"`}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	content: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
	boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
	board: { width: '100%', maxWidth: 340, gap: 8 },
	row: { flexDirection: 'row', gap: 8 },
	tile: {
		flex: 1,
		aspectRatio: 1,
		borderWidth: 2,
		borderRadius: GameRadius.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tileText: { fontSize: 28, fontFamily: GameFonts.display800 },
	dailyCaption: { fontFamily: GameFonts.body600, fontSize: 13, paddingTop: 12 },
	toast: {
		position: 'absolute',
		top: 10,
		alignSelf: 'center',
		backgroundColor: 'rgba(67, 36, 27, 0.92)',
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 12,
	},
	toastText: { color: '#ffffff', fontSize: 14, fontFamily: GameFonts.body700 },
	keyboard: {
		width: '100%',
		maxWidth: 500,
		alignSelf: 'center',
		paddingHorizontal: 8,
		paddingBottom: 10,
		gap: 6,
	},
	kbRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
	key: {
		flex: 1,
		height: 48,
		borderRadius: GameRadius.sm,
		alignItems: 'center',
		justifyContent: 'center',
		...GameShadow.subtle,
	},
	keyWide: { flex: 1.5 },
	keyText: { fontSize: 16, fontFamily: GameFonts.display700 },
	keyTextWide: { fontSize: 13 },
	keyPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
	stats: { alignSelf: 'stretch', marginTop: 4 },
	targetCard: {
		alignSelf: 'stretch',
		borderWidth: 1,
		borderRadius: 16,
		padding: 18,
		alignItems: 'center',
		marginBottom: 10,
	},
	howTo: { alignSelf: 'stretch', gap: 8 },
	howToText: { fontFamily: GameFonts.body500, fontSize: 14, lineHeight: 20 },
	howToBold: { fontFamily: GameFonts.body700 },
	exampleBox: {
		borderWidth: 1,
		borderRadius: GameRadius.md,
		padding: 14,
		gap: 10,
		marginTop: 4,
	},
	exampleRow: { flexDirection: 'row', gap: 5 },
	miniTile: {
		width: 34,
		height: 34,
		borderWidth: 2,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	miniTileText: { fontSize: 16, fontFamily: GameFonts.display800 },
	targetLabel: {
		fontFamily: GameFonts.body600,
		fontSize: 11,
		textTransform: 'uppercase',
		letterSpacing: 2,
	},
	targetWord: { fontFamily: GameFonts.display800, fontSize: 32, marginVertical: 2 },
	targetTranslation: { fontFamily: GameFonts.body600, fontSize: 15 },
	targetDefinition: {
		fontFamily: GameFonts.body500,
		fontSize: 13,
		fontStyle: 'italic',
		marginTop: 4,
		textAlign: 'center',
	},
});
