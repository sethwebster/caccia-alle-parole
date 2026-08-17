import { StyleSheet } from 'react-native';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';

import type { DailyStateTone } from './daily-copy';
import type { DailyRoutePuzzleModel } from './daily-route-model';

export const STATUS_COLORS: Record<DailyRoutePuzzleModel['statusTone'], { readonly background: string; readonly text: string }> = {
	idle: { background: GamePalette.primaryLight, text: GamePalette.primaryDark },
	active: { background: GamePalette.amberLight, text: GamePalette.amberDark },
	done: { background: GamePalette.successLight, text: GamePalette.successText },
	lost: { background: GamePalette.onPrimaryMuted, text: GamePalette.primaryDark },
};

export const ACTIVE_PUZZLE_BORDER_COLOR = GamePalette.amber;

export const STATE_TONE_COLORS: Record<DailyStateTone, { readonly background: string; readonly text: string; readonly accent: string }> = {
	loading: { background: GamePalette.primaryLight, text: GamePalette.primaryDark, accent: GamePalette.primary },
	warning: { background: GamePalette.amberLight, text: GamePalette.amberDark, accent: GamePalette.amber },
	error: { background: GamePalette.onPrimaryMuted, text: GamePalette.primaryDark, accent: GamePalette.error },
};

export const styles = StyleSheet.create({
	safe: { flex: 1 },
	scroll: { gap: 14, paddingHorizontal: 20, paddingBottom: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
	pressed: { transform: [{ scale: 0.97 }] },
	disabled: { opacity: 0.55 },
	gateCard: {
		borderRadius: GameRadius.md,
		borderWidth: 1.5,
		borderColor: GamePalette.primary,
		padding: 16,
		marginBottom: 14,
		gap: 8,
	},
	gateTitle: { fontFamily: GameFonts.display700, fontSize: 17 },
	gateMessage: { fontFamily: GameFonts.body500, fontSize: 14, lineHeight: 19 },
	gateButton: {
		marginTop: 4,
		backgroundColor: GamePalette.primary,
		borderRadius: GameRadius.sm,
		paddingVertical: 11,
		alignItems: 'center',
	},
	gateButtonDisabled: { opacity: 0.5 },
	gateButtonText: { fontFamily: GameFonts.body700, fontSize: 15, color: '#FFFFFF' },
	heroCard: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 22, gap: 14, ...GameShadow.raised },
	card: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 20, gap: 10, ...GameShadow.card },
	stateCard: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 22, gap: 12, ...GameShadow.raised },
	stateTone: { alignSelf: 'flex-start', borderRadius: GameRadius.pill, paddingHorizontal: 11, paddingVertical: 5 },
	stateToneText: { fontFamily: GameFonts.body700, fontSize: 11, letterSpacing: 1.1 },
	stateAccent: { width: 52, height: 5, borderRadius: GameRadius.pill },
	heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' },
	heroText: { flex: 1, gap: 4 },
	overline: { fontFamily: GameFonts.body600, fontSize: 13, letterSpacing: 3, color: GamePalette.primary },
	sectionOverline: { fontFamily: GameFonts.body700, fontSize: 12, letterSpacing: 2, color: GamePalette.primary },
	title: { fontFamily: GameFonts.display800, fontSize: 30, lineHeight: 34 },
	cardTitle: { fontFamily: GameFonts.display800, fontSize: 23, lineHeight: 27 },
	copy: { fontFamily: GameFonts.body500, fontSize: 15, lineHeight: 21 },
	progressBadge: { borderRadius: GameRadius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: GamePalette.primaryLight },
	progressBadgeText: { fontFamily: GameFonts.body700, fontSize: 12, color: GamePalette.primaryDark },
	progressTrack: { height: 12, borderRadius: GameRadius.pill, overflow: 'hidden' },
	progressFill: { height: '100%', borderRadius: GameRadius.pill, backgroundColor: GamePalette.primary },
	actionRow: { flexDirection: 'row', gap: 10 },
	primaryButton: { flex: 1, minHeight: 50, borderRadius: GameRadius.md, backgroundColor: GamePalette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
	primaryButtonText: { fontFamily: GameFonts.display700, fontSize: 17, color: GamePalette.onPrimary },
	secondaryButton: { minHeight: 50, borderRadius: GameRadius.md, backgroundColor: GamePalette.primaryLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
	secondaryButtonText: { fontFamily: GameFonts.display700, fontSize: 15, color: GamePalette.primaryDark },
	themePrompt: { fontFamily: GameFonts.body700, fontSize: 15, lineHeight: 21 },
	themeChoiceList: { gap: 8 },
	themeChoice: { minHeight: 48, borderWidth: 1, borderRadius: GameRadius.md, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center' },
	themeChoiceText: { fontFamily: GameFonts.body700, fontSize: 15 },
	themeFeedback: { borderRadius: GameRadius.md, padding: 14, gap: 6 },
	themeFeedbackTitle: { fontFamily: GameFonts.display700, fontSize: 17 },
	replayBadge: { alignSelf: 'flex-start', fontFamily: GameFonts.body700, fontSize: 12, color: GamePalette.amberDark },
	list: { gap: 12 },
	row: { borderWidth: 1, borderRadius: GameRadius.lg, overflow: 'hidden', ...GameShadow.card },
	rowPressable: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
	completedRow: { opacity: 0.82 },
	icon: { width: 48, height: 48, borderRadius: GameRadius.tile, alignItems: 'center', justifyContent: 'center' },
	iconText: { fontSize: 24 },
	rowText: { flex: 1, gap: 3, minWidth: 0 },
	rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
	rowTitle: { fontFamily: GameFonts.display700, fontSize: 20 },
	rowSubtitle: { fontFamily: GameFonts.body600, fontSize: 13 },
	statusPill: { borderRadius: GameRadius.pill, paddingHorizontal: 9, paddingVertical: 4 },
	statusText: { fontFamily: GameFonts.body700, fontSize: 11 },
	rowGiveUp: { borderTopWidth: 1, borderTopColor: GamePalette.primaryLight, paddingVertical: 12, alignItems: 'center' },
	rowGiveUpText: { fontFamily: GameFonts.display700, fontSize: 14, color: GamePalette.primaryDark },
	metaGrid: { gap: 8 },
	meta: { borderRadius: GameRadius.md, padding: 12, gap: 2 },
	metaLabel: { fontFamily: GameFonts.body700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
	metaValue: { fontFamily: GameFonts.body600, fontSize: 13 },
});
