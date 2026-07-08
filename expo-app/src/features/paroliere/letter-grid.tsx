import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
	Gesture,
	GestureDetector,
	type GestureStateChangeEvent,
	type GestureUpdateEvent,
	type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

import { GameFonts, GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

import { GRID_SIZE, type ParoliereService, type PathCell } from './service';

const GRID_GAP = 10;
const GRID_ROWS = Array.from({ length: GRID_SIZE }, (_, rowIndex) => ({ id: `row-${rowIndex}`, rowIndex }));
const GRID_COLUMNS = Array.from({ length: GRID_SIZE }, (_, colIndex) => ({ id: `cell-${colIndex}`, colIndex }));

class ParoliereDragSession {
	private active = false;

	begin(cell: PathCell | null, service: ParoliereService): void {
		this.active = cell !== null;
		if (cell) service.beginSelection(cell);
	}

	update(cell: PathCell | null, service: ParoliereService): void {
		if (!this.active || !cell) return;
		service.extendSelection(cell);
	}

	finalize(service: ParoliereService): void {
		if (!this.active) return;
		this.active = false;
		service.release();
	}
}

type PanEvent = GestureStateChangeEvent<PanGestureHandlerEventPayload> | GestureUpdateEvent<PanGestureHandlerEventPayload>;

export function LetterGrid({
	grid,
	currentPath,
	service,
}: {
	grid: string[][];
	currentPath: PathCell[];
	service: ParoliereService;
}) {
	const surface = useGameSurface();
	const [size, setSize] = useState(0);
	const [dragSession] = useState(() => new ParoliereDragSession());

	const cellAt = useCallback((x: number, y: number): PathCell | null => {
		if (size <= 0) return null;
		const tile = (size - GRID_GAP * (GRID_SIZE - 1)) / GRID_SIZE;
		const step = tile + GRID_GAP;
		const col = Math.floor(x / step);
		const row = Math.floor(y / step);
		if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
		const dx = x - (col * step + tile / 2);
		const dy = y - (row * step + tile / 2);
		if (Math.abs(dx) > tile * 0.44 || Math.abs(dy) > tile * 0.44) return null;
		return { row, col };
	}, [size]);

	const handleBegin = useCallback((event: PanEvent) => {
		dragSession.begin(cellAt(event.x, event.y), service);
	}, [cellAt, dragSession, service]);

	const handleUpdate = useCallback((event: PanEvent) => {
		dragSession.update(cellAt(event.x, event.y), service);
	}, [cellAt, dragSession, service]);

	const handleFinalize = useCallback(() => {
		dragSession.finalize(service);
	}, [dragSession, service]);

	const pan = useMemo(
		() => Gesture.Pan()
			.runOnJS(true)
			.minDistance(1)
			.onBegin(handleBegin)
			.onUpdate(handleUpdate)
			.onFinalize(handleFinalize),
		[handleBegin, handleFinalize, handleUpdate],
	);

	return (
		<GestureDetector gesture={pan}>
			<View style={styles.grid} onLayout={(event) => setSize(event.nativeEvent.layout.width)}>
				{GRID_ROWS.map(({ id, rowIndex }) => {
					const row = grid[rowIndex];
					return (
						<View key={id} style={styles.gridRow}>
							{GRID_COLUMNS.map(({ id: cellId, colIndex }) => {
								const letter = row[colIndex];
								const selected = currentPath.some((c) => c.row === rowIndex && c.col === colIndex);
								return (
									<View
										key={cellId}
										style={[
											styles.tile,
											selected
												? styles.tileSelected
												: { backgroundColor: surface.card, borderColor: surface.border },
										]}
									>
										<Text
											style={[styles.tileText, { color: selected ? '#fff' : surface.text }]}
										>
											{letter}
										</Text>
									</View>
								);
							})}
						</View>
					);
				})}
			</View>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	grid: { width: '100%', maxWidth: 360, aspectRatio: 1, gap: GRID_GAP },
	gridRow: { flex: 1, flexDirection: 'row', gap: GRID_GAP },
	tile: {
		flex: 1,
		borderRadius: 16,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tileSelected: {
		backgroundColor: GamePalette.primary,
		borderColor: GamePalette.primaryDark,
		transform: [{ scale: 1.05 }],
	},
	tileText: { fontSize: 30, fontFamily: GameFonts.display800 },
});
