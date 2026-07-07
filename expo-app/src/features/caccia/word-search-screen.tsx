import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, Keyframe } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/game/confetti';
import { GameHeader } from '@/components/game/game-header';
import { OptionButton } from '@/components/game/option-button';
import { ResultModal, ResultStat } from '@/components/game/result-modal';
import { StatPill } from '@/components/game/stat-pill';
import { GameFonts, GamePalette } from '@/constants/game-theme';
import { categories, formatCategory } from '@/data/word-data';
import { useGameSurface } from '@/hooks/use-game-surface';
import type { Difficulty, PlacedWord, WordSearchState } from '@/lib/types';
import type { SelectedCell } from '@/lib/wordDetection';

import { useGridSelection, useWordSearchGame, type Flash } from './use-word-search';
import { DIFFICULTY_LABELS, normalizeWord } from './word-search-service';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

// Ports the web's `cell-pop` / `cell-shake` CSS keyframes.
const cellPop = new Keyframe({
	0: { transform: [{ scale: 1 }] },
	50: { transform: [{ scale: 1.15 }] },
	100: { transform: [{ scale: 1 }] },
}).duration(300);
const cellShake = new Keyframe({
	0: { transform: [{ translateX: 0 }] },
	20: { transform: [{ translateX: -5 }] },
	40: { transform: [{ translateX: 5 }] },
	60: { transform: [{ translateX: -5 }] },
	80: { transform: [{ translateX: 5 }] },
	100: { transform: [{ translateX: 0 }] },
}).duration(500);

export function WordSearchScreen() {
	const surface = useGameSurface();
	const {
		game,
		hydrated,
		isActive,
		showModal,
		closeModal,
		burst,
		flash,
		start,
		replay,
		reset,
		submitSelection,
	} = useWordSearchGame();

	const [pickedCategory, setPickedCategory] = useState<string | null>(null);
	const [pickedDifficulty, setPickedDifficulty] = useState<Difficulty | null>(null);

	const resetToSetup = () => {
		setPickedCategory(null);
		setPickedDifficulty(null);
		reset();
	};

	const subtitle =
		game.category != null && game.difficulty != null
			? `${formatCategory(game.category)} • ${DIFFICULTY_LABELS[game.difficulty]}`
			: undefined;

	return (
		<SafeAreaView
			style={[styles.safe, { backgroundColor: surface.background }]}
			edges={['top', 'bottom']}
		>
			<GameHeader title="Caccia" subtitle={subtitle} onAction={resetToSetup} />
			{!hydrated ? null : !isActive ? (
				<SetupPanel
					pickedCategory={pickedCategory}
					pickedDifficulty={pickedDifficulty}
					onPickCategory={setPickedCategory}
					onPickDifficulty={setPickedDifficulty}
					onStart={() => {
						if (pickedCategory != null && pickedDifficulty != null) {
							start(pickedCategory, pickedDifficulty);
						}
					}}
				/>
			) : (
				<GameBoard game={game} flash={flash} onSelectionEnd={submitSelection} />
			)}
			<Confetti burst={burst} />
			<ResultModal
				visible={showModal}
				icon="🏆"
				title="Partita Terminata!"
				message={
					game.category != null
						? `Hai trovato tutte le parole in ${formatCategory(game.category)}!`
						: undefined
				}
				primaryLabel="Rigioca"
				onPrimary={replay}
				secondaryLabel="Nuova Partita"
				onSecondary={resetToSetup}
				onDismiss={closeModal}
			>
				<View style={[styles.modalStats, { backgroundColor: surface.tile, borderColor: surface.border }]}>
					<ResultStat label="Punteggio Finale" value={game.score} accent />
					<ResultStat
						label="Difficoltà"
						value={game.difficulty != null ? DIFFICULTY_LABELS[game.difficulty] : ''}
					/>
				</View>
			</ResultModal>
		</SafeAreaView>
	);
}

function SetupPanel({
	pickedCategory,
	pickedDifficulty,
	onPickCategory,
	onPickDifficulty,
	onStart,
}: {
	pickedCategory: string | null;
	pickedDifficulty: Difficulty | null;
	onPickCategory: (category: string) => void;
	onPickDifficulty: (difficulty: Difficulty) => void;
	onStart: () => void;
}) {
	const surface = useGameSurface();
	const canStart = pickedCategory != null && pickedDifficulty != null;

	return (
		<ScrollView contentContainerStyle={styles.setupScroll}>
			<Animated.View
				entering={FadeInDown.duration(400)}
				style={[styles.setupCard, { backgroundColor: surface.card, borderColor: surface.border }]}
			>
				<Text style={[styles.setupTitle, { color: surface.text }]}>Nuova Caccia</Text>

				<Text style={[styles.setupLabel, { color: surface.textSecondary }]}>
					Scegli una categoria
				</Text>
				<View style={styles.optionsGrid}>
					{categories.map((category) => (
						<View key={category} style={styles.optionHalf}>
							<OptionButton
								label={formatCategory(category)}
								active={pickedCategory === category}
								onPress={() => onPickCategory(category)}
							/>
						</View>
					))}
				</View>

				<Text style={[styles.setupLabel, { color: surface.textSecondary }]}>
					Livello di difficoltà
				</Text>
				<View style={styles.difficultyRow}>
					{DIFFICULTIES.map((difficulty) => (
						<View key={difficulty} style={styles.optionThird}>
							<OptionButton
								label={DIFFICULTY_LABELS[difficulty]}
								active={pickedDifficulty === difficulty}
								onPress={() => onPickDifficulty(difficulty)}
							/>
						</View>
					))}
				</View>

				<Pressable
					disabled={!canStart}
					onPress={onStart}
					style={({ pressed }) => [
						styles.startBtn,
						!canStart && styles.startBtnDisabled,
						pressed && canStart && styles.pressed,
					]}
				>
					<Text style={styles.startText}>Inizia Partita</Text>
				</Pressable>
			</Animated.View>
		</ScrollView>
	);
}

function GameBoard({
	game,
	flash,
	onSelectionEnd,
}: {
	game: WordSearchState;
	flash: Flash | null;
	onSelectionEnd: (cells: SelectedCell[]) => void;
}) {
	const surface = useGameSurface();
	const [gridWidth, setGridWidth] = useState(0);
	const gridSize = game.grid.length;
	const cellSize = gridSize > 0 && gridWidth > 0 ? Math.floor(gridWidth / gridSize) : 0;
	const { pan, selectedCells } = useGridSelection(game.grid, cellSize, onSelectionEnd);

	const selectedKeys = new Set(selectedCells.map((c) => `${c.row},${c.col}`));
	const flashKeys = new Set((flash?.cells ?? []).map((c) => `${c.row},${c.col}`));
	const foundNormalized = new Set(Array.from(game.foundWords, normalizeWord));
	const foundKeys = new Set<string>();
	for (const word of game.words) {
		if (!foundNormalized.has(normalizeWord(word.word))) continue;
		for (const cell of word.cells) foundKeys.add(`${cell.row},${cell.col}`);
	}

	const fontSize = Math.max(9, Math.round(cellSize * 0.45));

	return (
		<Animated.View entering={FadeIn.duration(300)} style={styles.board}>
			<View style={styles.statsRow}>
				<StatPill label="Paròle" value={`${game.foundWords.size}/${game.words.length}`} />
				<StatPill label="Punteggio" value={game.score} tone="accent" />
			</View>

			<View style={styles.gridWrap} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
				{cellSize > 0 ? (
					<GestureDetector gesture={pan}>
						<View
							collapsable={false}
							style={{ width: cellSize * gridSize, height: cellSize * gridSize }}
						>
							{game.grid.map((row, rowIndex) => (
								<View key={rowIndex} style={styles.gridRow}>
									{row.map((cell, colIndex) => {
										const key = `${rowIndex},${colIndex}`;
										const isFlashed = flash != null && flashKeys.has(key);
										const isSelected = selectedKeys.has(key);
										const isFound = foundKeys.has(key);
										const background = isFlashed
											? flash.kind === 'success'
												? GamePalette.success
												: GamePalette.error
											: isSelected
												? GamePalette.amber
												: isFound
													? GamePalette.success
													: surface.card;
										const highlighted = isFlashed || isSelected || isFound;
										const isError = isFlashed && flash.kind === 'error';
										const letter = (
											<Text
												style={[
													styles.cellText,
													{ fontSize, color: highlighted ? '#fff' : surface.text },
												]}
											>
												{cell.letter}
											</Text>
										);
										return (
											<View key={key} style={{ width: cellSize, height: cellSize, padding: 1 }}>
												{isError || isFound ? (
													// Remounts on error→found transitions so the keyframe replays.
													<Animated.View
														key={isError ? 'error' : 'found'}
														entering={isError ? cellShake : cellPop}
														style={[styles.cellInner, { backgroundColor: background }]}
													>
														{letter}
													</Animated.View>
												) : (
													<View style={[styles.cellInner, { backgroundColor: background }]}>
														{letter}
													</View>
												)}
											</View>
										);
									})}
								</View>
							))}
						</View>
					</GestureDetector>
				) : null}
			</View>

			<WordChips words={game.words} foundWords={game.foundWords} />
		</Animated.View>
	);
}

function WordChips({ words, foundWords }: { words: PlacedWord[]; foundWords: Set<string> }) {
	const surface = useGameSurface();

	return (
		<View style={[styles.panel, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<View style={styles.panelHeader}>
				<Text style={[styles.panelTitle, { color: surface.textTertiary }]}>Lista Paròle</Text>
				<Text style={styles.panelCount}>
					{foundWords.size} di {words.length}
				</Text>
			</View>
			<ScrollView contentContainerStyle={styles.chips}>
				{words.map((word) => {
					const found = foundWords.has(word.word);
					return (
						<View
							key={word.word}
							style={[
								styles.chip,
								found
									? styles.chipFound
									: { backgroundColor: surface.tile, borderColor: surface.border },
							]}
						>
							<View style={styles.chipWordRow}>
								<Text
									style={[
										styles.chipWord,
										{ color: found ? GamePalette.successText : surface.text },
										found && styles.chipWordFound,
									]}
								>
									{word.word}
								</Text>
								{found ? <Text style={styles.chipBadge}>✓</Text> : null}
							</View>
							<Text
								style={[
									styles.chipTranslation,
									{ color: found ? GamePalette.successText : surface.textTertiary },
								]}
							>
								{word.translation}
							</Text>
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	setupScroll: {
		padding: 20,
		paddingBottom: 40,
		maxWidth: 640,
		width: '100%',
		alignSelf: 'center',
	},
	setupCard: {
		borderRadius: 24,
		borderWidth: 1,
		padding: 24,
	},
	setupTitle: {
		fontSize: 24,
		fontFamily: GameFonts.display800,
		textAlign: 'center',
		marginBottom: 20,
	},
	setupLabel: {
		fontSize: 12,
		fontFamily: GameFonts.body700,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 10,
	},
	optionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginBottom: 22,
	},
	optionHalf: { flexBasis: '47%', flexGrow: 1 },
	difficultyRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 22,
	},
	optionThird: { flex: 1 },
	startBtn: {
		backgroundColor: GamePalette.primary,
		paddingVertical: 17,
		borderRadius: 16,
		alignItems: 'center',
	},
	startBtnDisabled: { opacity: 0.5 },
	startText: { color: '#fff', fontFamily: GameFonts.display700, fontSize: 17 },
	pressed: { opacity: 0.85 },
	board: {
		flex: 1,
		padding: 16,
		gap: 14,
		maxWidth: 640,
		width: '100%',
		alignSelf: 'center',
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 12,
	},
	gridWrap: { alignItems: 'center' },
	gridRow: { flexDirection: 'row' },
	cellInner: {
		flex: 1,
		borderRadius: 5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cellText: { fontFamily: GameFonts.display700, textTransform: 'uppercase' },
	panel: {
		flex: 1,
		minHeight: 120,
		borderRadius: 20,
		borderWidth: 1,
		padding: 14,
	},
	panelHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	panelTitle: {
		fontSize: 12,
		fontFamily: GameFonts.body600,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	panelCount: {
		fontSize: 12,
		fontFamily: GameFonts.body700,
		color: GamePalette.primary,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		paddingBottom: 6,
	},
	chip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
	},
	chipFound: {
		backgroundColor: GamePalette.successLight,
		borderColor: GamePalette.successLight,
	},
	chipWordRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	chipWord: {
		fontFamily: GameFonts.body700,
		fontSize: 13,
		textTransform: 'uppercase',
	},
	chipWordFound: { textDecorationLine: 'line-through' },
	chipBadge: {
		fontSize: 11,
		fontFamily: GameFonts.body700,
		color: GamePalette.successText,
	},
	chipTranslation: {
		fontSize: 11,
		fontFamily: GameFonts.body600,
		marginTop: 1,
	},
	modalStats: {
		alignSelf: 'stretch',
		borderRadius: 16,
		borderWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 4,
		marginTop: 4,
	},
});
