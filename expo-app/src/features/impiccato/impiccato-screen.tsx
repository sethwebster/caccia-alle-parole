import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal } from '@/components/game/result-modal';
import { StatPill } from '@/components/game/stat-pill';
import { GameFonts, GamePalette } from '@/constants/game-theme';
import { formatCategory } from '@/data/word-data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameSurface } from '@/hooks/use-game-surface';
import { Gallows } from '@/features/impiccato/gallows';
import { useImpiccatoGame, useWebKeyboard } from '@/features/impiccato/hooks';
import {
	getDisplaySlots,
	KEYBOARD_LAYOUT,
	MAX_LIVES,
	targetHasLetter,
	type ImpiccatoRound,
} from '@/features/impiccato/logic';

export function ImpiccatoScreen() {
	const surface = useGameSurface();
	const scheme = useColorScheme();
	const { round, guess, startRound, modalVisible, dismissModal, confettiBurst } = useImpiccatoGame();
	useWebKeyboard(guess);

	const won = round?.gameState === 'won';

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}>
			<GameHeader title="L'Impiccato" subtitle="Sfida Classica" onAction={() => startRound(false)} />
			{round ? (
				<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
					<View style={styles.upper}>
						<Animated.View
							entering={FadeIn}
							style={[styles.panel, { backgroundColor: surface.card, borderColor: surface.border }]}
						>
							<View style={styles.categoryPill}>
								<Text style={styles.categoryText}>{formatCategory(round.targetCategory)}</Text>
							</View>
							<Gallows
								mistakes={MAX_LIVES - round.remainingLives}
								bodyColor={scheme === 'dark' ? '#F8EFE2' : GamePalette.slate}
							/>
						</Animated.View>
						<View style={styles.statusColumn}>
							<View style={[styles.livesCard, { backgroundColor: surface.card, borderColor: surface.border }]}>
								<Text style={[styles.livesLabel, { color: surface.textTertiary }]}>Vite</Text>
								<View style={styles.hearts}>
									{Array.from({ length: MAX_LIVES }, (_, i) => (
										<Text key={i} style={[styles.heart, i >= round.remainingLives && styles.heartLost]}>
											{i < round.remainingLives ? '❤️' : '💀'}
										</Text>
									))}
								</View>
							</View>
							<StatPill label="Punteggio" value={round.score} tone="accent" />
						</View>
					</View>

					<Animated.View
						entering={FadeInDown.delay(200)}
						style={[styles.wordCard, { backgroundColor: surface.card, borderColor: surface.border }]}
					>
						{getDisplaySlots(round).map((slot, i) =>
							slot.kind === 'gap' ? (
								<View key={i} style={styles.wordGap} />
							) : (
								<View
									key={i}
									style={[
										styles.slot,
										{ borderBottomColor: slot.kind === 'hidden' ? GamePalette.primary : surface.border },
									]}
								>
									{slot.kind === 'hidden' ? null : (
										// Keyed by char: revealing must mount a fresh Text — updating an
										// RCTParagraph from ''→letter leaves a stale 0-width measurement.
										<Text key={slot.char} style={[styles.slotText, { color: surface.text }]}>
											{slot.char}
										</Text>
									)}
								</View>
							),
						)}
					</Animated.View>

					<Animated.View entering={FadeIn.delay(400)} style={styles.keyboard}>
						{KEYBOARD_LAYOUT.map((row, rowIndex) => (
							<View key={rowIndex} style={styles.keyRow}>
								{row.map((letter) => (
									<KeyButton key={letter} letter={letter} round={round} onPress={guess} />
								))}
							</View>
						))}
					</Animated.View>
				</ScrollView>
			) : (
				<View style={styles.scroll} />
			)}

			<Confetti burst={confettiBurst} />

			<ResultModal
				visible={modalVisible && round !== null}
				icon={won ? '🎉' : '🎭'}
				title={won ? 'Vittoria!' : 'Game Over'}
				primaryLabel="Continua Sfida"
				onPrimary={() => {
					dismissModal();
					startRound(true);
				}}
				secondaryLabel="Nuova Partita"
				onSecondary={() => {
					dismissModal();
					startRound(false);
				}}
				onDismiss={dismissModal}
			>
				{round ? <AnswerCard round={round} /> : null}
			</ResultModal>
		</SafeAreaView>
	);
}

function KeyButton({
	letter,
	round,
	onPress,
}: {
	letter: string;
	round: ImpiccatoRound;
	onPress: (letter: string) => void;
}) {
	const surface = useGameSurface();
	const guessed = round.guessedLetters.includes(letter);
	const correct = guessed && targetHasLetter(round, letter);
	const wrong = guessed && !correct;
	const disabled = guessed || round.gameState !== 'playing';

	return (
		<Pressable
			disabled={disabled}
			onPress={() => onPress(letter)}
			style={({ pressed }) => [
				styles.key,
				{ backgroundColor: surface.card, borderColor: surface.border },
				correct && styles.keyCorrect,
				wrong && { backgroundColor: surface.tile, borderColor: surface.tile },
				disabled && !guessed && styles.keyFaded,
				pressed && !disabled && styles.keyPressed,
			]}
		>
			<Text
				style={[
					styles.keyText,
					{ color: correct ? '#fff' : wrong ? surface.textTertiary : surface.text },
				]}
			>
				{letter}
			</Text>
		</Pressable>
	);
}

/** 'La parola era' card inside the result modal: word, translation, definition. */
function AnswerCard({ round }: { round: ImpiccatoRound }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.answerCard, { backgroundColor: surface.tile, borderColor: surface.border }]}>
			<Text style={[styles.answerLabel, { color: surface.textTertiary }]}>La parola era</Text>
			<Text style={styles.answerWord}>{round.targetWord}</Text>
			<Text style={[styles.answerTranslation, { color: surface.text }]}>{round.targetTranslation}</Text>
			<Text style={[styles.answerDefinition, { color: surface.textTertiary }]}>
				“{round.targetDefinition}”
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	scroll: { flex: 1 },
	content: {
		flexGrow: 1,
		padding: 16,
		gap: 16,
		maxWidth: 640,
		width: '100%',
		alignSelf: 'center',
	},
	upper: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
	panel: {
		flex: 1,
		borderRadius: 24,
		borderWidth: 1,
		padding: 12,
		alignItems: 'center',
		gap: 8,
	},
	categoryPill: {
		backgroundColor: GamePalette.primaryLight,
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 99,
	},
	categoryText: {
		color: GamePalette.primary,
		fontSize: 11,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	statusColumn: { width: 118, gap: 12 },
	livesCard: {
		borderRadius: 20,
		borderWidth: 1,
		padding: 12,
		alignItems: 'center',
		gap: 8,
	},
	livesLabel: {
		fontSize: 10,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	hearts: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 4,
		maxWidth: 84,
	},
	heart: { fontSize: 18 },
	heartLost: { opacity: 0.35 },
	wordCard: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		rowGap: 10,
		columnGap: 7,
		borderRadius: 20,
		borderWidth: 1,
		padding: 18,
	},
	wordGap: { width: 16 },
	slot: {
		width: 30,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: 3,
	},
	slotText: { fontSize: 22, fontFamily: GameFonts.display800, textTransform: 'uppercase' },
	keyboard: { marginTop: 'auto', gap: 7 },
	keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
	key: {
		flex: 1,
		maxWidth: 56,
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	keyCorrect: { backgroundColor: GamePalette.success, borderColor: GamePalette.success },
	keyFaded: { opacity: 0.5 },
	keyPressed: { transform: [{ translateY: 2 }], opacity: 0.9 },
	keyText: { fontSize: 16, fontFamily: GameFonts.display700 },
	answerCard: {
		alignSelf: 'stretch',
		borderRadius: 20,
		borderWidth: 1,
		padding: 20,
		alignItems: 'center',
		marginTop: 4,
	},
	answerLabel: {
		fontSize: 11,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	answerWord: {
		fontSize: 32,
		fontFamily: GameFonts.display800,
		color: GamePalette.primary,
		marginVertical: 6,
		textAlign: 'center',
	},
	answerTranslation: { fontSize: 15, fontFamily: GameFonts.body700, marginBottom: 6 },
	answerDefinition: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
});
