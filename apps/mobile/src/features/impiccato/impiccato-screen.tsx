import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal } from '@/components/game/result-modal';
import { StatPill } from '@/components/game/stat-pill';
import { GamePalette } from '@/constants/game-theme';
import { formatCategory } from '@/data/word-data';
import { DAILY_COPY } from '@/features/daily/daily-copy';
import { formatPlayModeSubtitle } from '@/features/daily/route-policy';
import type { DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import { useGameSurface } from '@/hooks/use-game-surface';
import { Balloon } from '@/features/impiccato/balloon';
import { useImpiccatoGame, useWebKeyboard } from '@/features/impiccato/hooks';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';
import {
	getDisplaySlots,
	KEYBOARD_LAYOUT,
	MAX_LIVES,
	targetHasLetter,
	type ImpiccatoRound,
} from '@/features/impiccato/logic';
import { styles } from '@/features/impiccato/impiccato-screen.styles';

export function ImpiccatoScreen({ routeSession }: { readonly routeSession: DailyGameRouteSession }) {
	const surface = useGameSurface();
	const router = useRouter();
	const isChallenge = routeSession.playMode.kind === 'challenge';
	const { round, guess, startRound, modalVisible, dismissModal, confettiBurst, dailyTerminal } = useImpiccatoGame(routeSession);
	useScreenInteractive(round !== null);
	useWebKeyboard(guess);
	const challengeRouteLoading = routeSession.playMode.kind === 'challenge' && routeSession.challenge === undefined;

	const won = round?.gameState === 'won';

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}>
			<GameHeader title="Il Palloncino" subtitle={formatPlayModeSubtitle(routeSession.playMode, 'Non farlo scoppiare!')} onAction={isChallenge ? undefined : () => startRound(false)} />
				{challengeRouteLoading ? (
					<ChallengeLoading />
				) : round ? (
					<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
					<View style={styles.upper}>
						<Animated.View
							entering={FadeIn}
							style={[styles.panel, { backgroundColor: surface.card, borderColor: surface.border }]}
						>
							<View style={styles.categoryPill}>
								<Text style={styles.categoryText}>{formatCategory(round.targetCategory)}</Text>
							</View>
							<Balloon mistakes={MAX_LIVES - round.remainingLives} />
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
				icon={won ? '🎉' : '💥'}
				title={won ? 'Vittoria!' : 'Scoppiato!'}
				primaryLabel={isChallenge ? DAILY_COPY.challenge.returnToHub : 'Continua Sfida'}
				onPrimary={() => {
					if (isChallenge) {
						void dailyTerminal.complete(() => {
							dismissModal();
							router.back();
						});
					} else {
						dismissModal();
						startRound(true);
					}
				}}
				secondaryLabel={isChallenge ? undefined : 'Nuova Partita'}
				onSecondary={
					isChallenge
						? undefined
						: () => {
								dismissModal();
								startRound(false);
							}
				}
				onDismiss={dismissModal}
			>
				{round ? <AnswerCard round={round} /> : null}
			</ResultModal>
		</SafeAreaView>
	);
}

function ChallengeLoading() {
	const surface = useGameSurface();
	return (
		<View style={styles.loadingCard}>
			<Text style={[styles.loadingTitle, { color: surface.text }]}>Prepariamo la sfida</Text>
			<Text style={[styles.loadingCopy, { color: surface.textSecondary }]}>Caricamento del tentativo ufficiale in corso.</Text>
		</View>
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
