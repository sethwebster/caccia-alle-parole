import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { StatPill } from '@/components/game/stat-pill';
import { WordMeaningSheet } from '@/components/game/word-meaning-sheet';
import { GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useWordMeaning } from '@/hooks/use-word-meaning';

import { useSubmitPulse } from './hooks';
import { findParoliereCellAtPoint } from './paroliere-board-hit-test';
import { GRID_GAP, styles } from './paroliere-board.styles';
import {
	GRID_SIZE,
	wordPoints,
	type ParoliereService,
	type ParoliereState,
	type PathCell,
	type SubmitOutcome,
} from './service';

class DragGestureState {
	dragging = false;

	begin(hasCell: boolean): void {
		this.dragging = hasCell;
	}

	finish(): void {
		this.dragging = false;
	}
}

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function GameBoard({ state, service }: { state: ParoliereState; service: ParoliereService }) {
	const { selected, select, dismiss } = useWordMeaning();
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
			<WordDisplay currentWord={state.currentWord} outcome={state.lastOutcome} onDefine={select} />
			<LetterGrid grid={state.grid} currentPath={state.currentPath} service={service} onDefine={select} />
			{state.foundWords.length > 0 ? <FoundWords words={state.foundWords} onDefine={select} /> : null}
			<WordMeaningSheet meaning={selected} onDismiss={dismiss} />
		</Animated.View>
	);
}

function WordDisplay({ currentWord, outcome, onDefine }: { currentWord: string; outcome: SubmitOutcome | null; onDefine: (word: string) => void }) {
	const surface = useGameSurface();
	const pulseStyle = useSubmitPulse(outcome);
	const active = currentWord.length > 0;
	return (
		<Pressable
			accessibilityRole={active ? "button" : undefined}
			accessibilityLabel={active ? `Cosa significa ${currentWord}` : undefined}
			disabled={!active}
			onPress={() => onDefine(currentWord)}
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
		</Pressable>
	);
}

function LetterGrid({
	grid,
	currentPath,
	service,
	onDefine,
}: {
	grid: string[][];
	currentPath: PathCell[];
	service: ParoliereService;
	onDefine: (word: string) => void;
}) {
	const surface = useGameSurface();
	const [wrapSize, setWrapSize] = useState({ width: 0, height: 0 });
	const [gestureState] = useState(() => new DragGestureState());
	// True square sized to the space actually available, so rendered tiles and
	// hit-test geometry can never drift apart when flex compresses the column.
	const side = Math.floor(Math.min(wrapSize.width, wrapSize.height, 360));

	const cellAt = (x: number, y: number): PathCell | null => {
		return findParoliereCellAtPoint({ boardSize: side, gap: GRID_GAP, gridSize: GRID_SIZE, x, y });
	};

	const pan = Gesture.Pan()
		.runOnJS(true)
		.minDistance(0)
		.onBegin((event) => {
			const cell = cellAt(event.x, event.y);
			gestureState.begin(cell !== null);
			if (cell) service.beginSelection(cell);
		})
		.onUpdate((event) => {
			if (!gestureState.dragging) return;
			const cell = cellAt(event.x, event.y);
			if (cell) service.extendSelection(cell);
		})
		.onFinalize(() => {
			if (!gestureState.dragging) return;
			gestureState.finish();
			service.release();
		});

	const rowCounts = new Map<string, number>();
	let rowIndex = 0;
	const renderedRows: { key: string; letters: { key: string; letter: string; selected: boolean }[] }[] = [];

	for (const row of grid) {
		const currentRowIndex = rowIndex;
		rowIndex += 1;
		const rowBase = row.join('');
		const rowOccurrence = rowCounts.get(rowBase) ?? 0;
		rowCounts.set(rowBase, rowOccurrence + 1);
		const rowKey = `${rowBase}:${rowOccurrence}`;
		const letterCounts = new Map<string, number>();
		let colIndex = 0;
		const letters = row.map((letter) => {
			const currentColIndex = colIndex;
			colIndex += 1;
			const occurrence = letterCounts.get(letter) ?? 0;
			letterCounts.set(letter, occurrence + 1);
			return {
				key: `${rowKey}:${letter}:${occurrence}`,
				letter,
				selected: currentPath.some((c) => c.row === currentRowIndex && c.col === currentColIndex),
			};
		});
		renderedRows.push({ key: rowKey, letters });
	}

	return (
		<View
			style={styles.gridWrap}
			onLayout={(event) => setWrapSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
		>
			{side > 0 ? (
				<GestureDetector gesture={pan}>
					<View style={[styles.grid, { width: side, height: side }]}>
						{renderedRows.map((row) => (
					<View key={row.key} style={styles.gridRow}>
						{row.letters.map((cell) => (
							<Pressable
								key={cell.key}
								accessibilityRole="button"
								accessibilityLabel={`Cosa significa ${cell.letter}`}
								onLongPress={() => onDefine(cell.letter)}
								style={[
									styles.tile,
									cell.selected
										? styles.tileSelected
										: { backgroundColor: surface.card, borderColor: surface.border },
								]}
							>
								<Text style={[styles.tileText, { color: cell.selected ? '#fff' : surface.text }]}>{cell.letter}</Text>
							</Pressable>
								))}
							</View>
						))}
					</View>
				</GestureDetector>
			) : null}
		</View>
	);
}

function FoundWords({ words, onDefine }: { words: string[]; onDefine: (word: string) => void }) {
	const surface = useGameSurface();
	const sorted = [...words].sort();
	return (
		<View style={[styles.foundPanel, { backgroundColor: surface.card, borderColor: surface.border }]}>
			<Text style={[styles.foundTitle, { color: surface.textTertiary }]}>Parole Trovate</Text>
			<ScrollView contentContainerStyle={styles.chipWrap}>
				{sorted.map((word) => (
					<Animated.View key={word} entering={ZoomIn.duration(200)}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`Cosa significa ${word}`}
							onPress={() => onDefine(word)}
							style={styles.chip}
						>
							<Text style={styles.chipText}>{word}</Text>
						</Pressable>
					</Animated.View>
				))}
			</ScrollView>
		</View>
	);
}
