import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { ResultModal } from '@/components/game/result-modal';
import { StatPill } from '@/components/game/stat-pill';
import { GameFonts, GamePalette } from '@/constants/game-theme';
import { formatCategory } from '@/data/word-data';
import { DAILY_COPY } from '@/features/daily/daily-copy';
import { formatPlayModeSubtitle } from '@/features/daily/route-policy';
import type { DailyGameRouteSession } from '@/features/daily/use-daily-game-route-mode';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

import { MAX_HINTS } from './anagrammi-service';
import { useAnagrammi } from './use-anagrammi';

function formatTime(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AnagrammiScreen({ routeSession }: { readonly routeSession: DailyGameRouteSession }) {
	const surface = useGameSurface();
	const router = useRouter();
	const isChallenge = routeSession.playMode.kind === 'challenge';
	const game = useAnagrammi(routeSession);
	useScreenInteractive(game.hydrated);
	const { state } = game;
	const { round } = state;
	const playing = state.status === 'playing';

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}>
			<GameHeader title="Anagrammi+" subtitle={formatPlayModeSubtitle(routeSession.playMode, 'Dominio Verbale')} onAction={isChallenge ? undefined : game.reset} />
			{game.hydrated ? (
				<View style={styles.content}>
					<View style={styles.stats}>
						<StatPill
							label="Tempo"
							value={formatTime(game.timeLeft)}
							tone={game.timeLeft < 15 ? 'warning' : 'default'}
						/>
						<StatPill label="Punteggio" value={state.score} tone="accent" />
						<StatPill label="Streak" value={`🔥 ${state.streak}`} />
					</View>

					<Animated.View
						key={`categoria-${round.targetWord}`}
						entering={FadeIn.duration(300)}
						style={[styles.categoryCard, { backgroundColor: surface.card, borderColor: surface.border }]}
					>
						<Text style={[styles.categoryLabel, { color: surface.textTertiary }]}>Categoria</Text>
						<Text style={[styles.categoryValue, { color: surface.text }]}>{formatCategory(round.category)}</Text>
					</Animated.View>

					<View style={styles.tilesArea}>
						{round.tiles.map((letter, i) => {
							const used = state.picked.includes(i);
							return (
								<Animated.View key={`${round.targetWord}-${i}`} entering={FadeInDown.delay(i * 50)}>
									<Pressable
										onPress={() => game.tapTile(i)}
										disabled={used || !playing}
										style={({ pressed }) => [
											styles.tile,
											(used || !playing) && styles.tileDisabled,
											pressed && styles.tilePressed,
										]}
									>
										<Text style={styles.tileText}>{letter}</Text>
									</Pressable>
								</Animated.View>
							);
						})}
					</View>

					<View style={styles.slotsArea}>
						{Array.from({ length: round.targetWord.length }, (_, i) => {
							const letter = game.guess[i];
							const filled = letter !== undefined;
							return (
								<View
									key={i}
									style={[
										styles.slot,
										{ backgroundColor: surface.card, borderColor: surface.border },
										filled && styles.slotFilled,
									]}
								>
									{filled ? (
										// Keyed by letter: a content swap must remount, not update —
										// updating an RCTParagraph from ''→'I' leaves a stale 0-width measurement.
										<Text key={letter} style={[styles.slotText, { color: GamePalette.primary }]}>
											{letter}
										</Text>
									) : null}
								</View>
							);
						})}
					</View>

					<View style={styles.actions}>
						<View style={styles.actionRow}>
							<ActionButton
								label={`Indizio (${MAX_HINTS - state.hintsUsed})`}
								onPress={game.requestHint}
								disabled={state.hintsUsed >= MAX_HINTS || !playing}
								background={GamePalette.amberLight}
								color={GamePalette.amberDark}
								grow
							/>
							<ActionButton
								label="⌫"
								accessibilityLabel="Cancella lettera"
								onPress={game.backspace}
								disabled={game.guess.length === 0 || !playing}
								background={surface.tile}
								color={surface.textSecondary}
							/>
						</View>
						<View style={styles.actionRow}>
							<ActionButton
								label="✓ Invia"
								onPress={game.submit}
								disabled={game.guess.length !== round.targetWord.length || !playing}
								background={GamePalette.primary}
								color="#fff"
								grow
							/>
							<ActionButton
								label="»"
								accessibilityLabel="Salta parola"
								onPress={game.skip}
								disabled={!playing}
								background={GamePalette.onPrimaryMuted}
								color={GamePalette.primaryDark}
							/>
						</View>
					</View>
				</View>
			) : (
				<View style={styles.content} />
			)}

			<ResultModal
				visible={game.modalVisible}
				icon={state.status === 'correct' ? '🌟' : '⏰'}
				title={state.status === 'correct' ? 'Ottimo Anagramma!' : 'Tempo Scaduto'}
				primaryLabel={isChallenge ? DAILY_COPY.challenge.returnToHub : 'Prossima Parola'}
				onPrimary={isChallenge ? () => void game.dailyTerminal.complete(() => router.back()) : game.next}
				secondaryLabel={isChallenge ? undefined : 'Ricomincia Sfida'}
				onSecondary={isChallenge ? undefined : game.reset}
				onDismiss={game.dismissModal}
			>
				<View style={[styles.answerCard, { backgroundColor: surface.tile, borderColor: surface.border }]}>
					<Text style={[styles.answerLabel, { color: surface.textTertiary }]}>La parola corretta</Text>
					<Text style={styles.answerWord}>{round.targetWord}</Text>
					<Text style={[styles.answerTranslation, { color: surface.text }]}>{round.translation}</Text>
					<Text style={[styles.answerDefinition, { color: surface.textTertiary }]}>{`"${round.definition}"`}</Text>
				</View>
			</ResultModal>

			<Confetti burst={game.confettiBurst} />
		</SafeAreaView>
	);
}

type ActionButtonProps = {
	label: string;
	/** Required for glyph-only labels that a screen reader can't speak. */
	accessibilityLabel?: string;
	onPress: () => void;
	disabled?: boolean;
	background: string;
	color: string;
	/** Fills the row; square icon button otherwise. */
	grow?: boolean;
};

function ActionButton({
	label,
	accessibilityLabel,
	onPress,
	disabled,
	background,
	color,
	grow,
}: ActionButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.actionBtn,
				grow ? styles.actionGrow : styles.actionSquare,
				{ backgroundColor: background },
				disabled && styles.actionDisabled,
				pressed && !disabled && styles.actionPressed,
			]}
		>
			<Text style={[styles.actionText, { color }]}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	content: {
		flex: 1,
		width: '100%',
		maxWidth: 640,
		alignSelf: 'center',
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 20,
		gap: 24,
	},
	stats: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
	categoryCard: {
		alignSelf: 'center',
		alignItems: 'center',
		gap: 2,
		paddingVertical: 8,
		paddingHorizontal: 24,
		borderRadius: 12,
		borderWidth: 1,
	},
	categoryLabel: {
		fontSize: 10,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	categoryValue: { fontSize: 16, fontFamily: GameFonts.display700, textTransform: 'capitalize' },
	tilesArea: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
		marginTop: 8,
	},
	tile: {
		width: 52,
		height: 52,
		borderRadius: 14,
		backgroundColor: GamePalette.primary,
		alignItems: 'center',
		justifyContent: 'center',
		boxShadow: '0 4px 0 #9E2F21',
	},
	tilePressed: { transform: [{ translateY: 2 }], boxShadow: '0 2px 0 #9E2F21' },
	tileDisabled: { opacity: 0.5 },
	tileText: { color: '#fff', fontSize: 24, fontFamily: GameFonts.display800 },
	slotsArea: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
	},
	slot: {
		width: 48,
		height: 56,
		borderWidth: 2,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	slotFilled: {
		borderColor: GamePalette.primary,
		backgroundColor: GamePalette.primaryLight,
	},
	slotText: { fontSize: 24, fontFamily: GameFonts.display800 },
	actions: { marginTop: 'auto', gap: 12 },
	actionRow: { flexDirection: 'row', gap: 12 },
	actionBtn: {
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
	},
	actionGrow: { flex: 1 },
	actionSquare: { width: 64 },
	actionDisabled: { opacity: 0.5 },
	actionPressed: { transform: [{ translateY: 2 }], opacity: 0.9 },
	actionText: { fontSize: 16, fontFamily: GameFonts.display700 },
	answerCard: {
		alignSelf: 'stretch',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 20,
		paddingVertical: 20,
		paddingHorizontal: 16,
		marginTop: 4,
	},
	answerLabel: {
		fontSize: 11,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	answerWord: {
		fontSize: 34,
		fontFamily: GameFonts.display800,
		color: GamePalette.primary,
		marginVertical: 6,
		textAlign: 'center',
	},
	answerTranslation: { fontSize: 15, fontFamily: GameFonts.body700, marginBottom: 6, textAlign: 'center' },
	answerDefinition: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
});
