/**
 * Game palette shared by all five games. Mirrors the Claude Design
 * "tomato bold" kit: tomato brand, warm cream surfaces, brown inks,
 * basil/amber/olive reserved for gameplay feedback.
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
	primary: '#C33F2E', // tomato
	primaryDark: '#9E2F21', // tomato-deep
	primaryLight: '#F7E3CE', // cream-tile
	onPrimary: '#FFF8EE', // cream-on-brand
	onPrimaryMuted: '#F3C4B4', // rosa
	amber: '#D99A2B', // letter present
	amberDark: '#B37E1F',
	amberLight: '#F7E9CB',
	success: '#578A3F', // basil — letter correct
	successLight: '#E2EDD8', // basil-soft
	successText: '#3E6B2C',
	absent: '#A99887', // olive-gray — letter absent
	error: '#C33F2E',
	slate: '#43241B', // ink — dark overlays / toasts
} as const;

export const GameRadius = {
	sm: 12, // small chips, letter tiles' inner radius
	md: 16, // buttons, inputs
	lg: 22, // cards, rows
	tile: 18, // emoji tiles
	pill: 999,
} as const;

/** Warm brown shadows, never gray. */
export const GameShadow = {
	card: {
		shadowColor: '#78341E',
		shadowOpacity: 0.12,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 8 },
		elevation: 4,
	},
	raised: {
		shadowColor: '#78341E',
		shadowOpacity: 0.18,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 12 },
		elevation: 8,
	},
	subtle: {
		shadowColor: '#78341E',
		shadowOpacity: 0.08,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
} as const;

/** Baloo 2 = display/headings/buttons; Figtree = body/labels/captions. */
export const GameFonts = {
	display600: 'Baloo2_600SemiBold',
	display700: 'Baloo2_700Bold',
	display800: 'Baloo2_800ExtraBold',
	body500: 'Figtree_500Medium',
	body600: 'Figtree_600SemiBold',
	body700: 'Figtree_700Bold',
} as const;

export const GameSurfaces: Record<'light' | 'dark', GameSurface> = {
	light: {
		background: '#F8EFE2', // cream-page
		card: '#FFFCF5', // cream-card
		border: '#EBD9C3', // border-soft
		text: '#43241B', // ink
		textSecondary: '#96705E', // ink-soft
		textTertiary: '#C9A98B', // ink-faint
		tile: '#F7E3CE', // cream-tile
	},
	dark: {
		background: '#211310',
		card: '#2E1C15',
		border: '#4A3226',
		text: '#F8EFE2',
		textSecondary: '#D9BFA9',
		textTertiary: '#96705E',
		tile: '#3B2619',
	},
};
