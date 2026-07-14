import { StyleSheet } from 'react-native';

import { GameFonts, GamePalette } from '@/constants/game-theme';

export const GRID_GAP = 10;

export const styles = StyleSheet.create({
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
	gridWrap: { alignSelf: 'stretch', flexGrow: 1, flexShrink: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
	grid: { gap: GRID_GAP },
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
		backgroundColor: GamePalette.amberLight,
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	chipText: { color: GamePalette.amberDark, fontSize: 13, fontFamily: GameFonts.body700 },
});
