/**
 * Game palette shared by all five games. Mirrors the web app's design
 * tokens (indigo primary, amber selection, green success, red error).
 */
export type GameSurface = {
	background: string;
	card: string;
	border: string;
	text: string;
	textSecondary: string;
	textTertiary: string;
	tile: string;
};

export const GamePalette = {
	primary: '#4f46e5',
	primaryDark: '#4338ca',
	primaryLight: '#eef2ff',
	amber: '#f59e0b',
	amberDark: '#d97706',
	success: '#22c55e',
	successLight: '#dcfce7',
	successText: '#0f5132',
	error: '#ef4444',
	slate: '#1e293b',
} as const;

export const GameSurfaces: Record<'light' | 'dark', GameSurface> = {
	light: {
		background: '#f8fafc',
		card: '#ffffff',
		border: '#e2e8f0',
		text: '#0f172a',
		textSecondary: '#475569',
		textTertiary: '#94a3b8',
		tile: '#f1f5f9',
	},
	dark: {
		background: '#0b1120',
		card: '#151b2e',
		border: '#293247',
		text: '#f1f5f9',
		textSecondary: '#b6c0d4',
		textTertiary: '#6b7690',
		tile: '#1e2740',
	},
};
