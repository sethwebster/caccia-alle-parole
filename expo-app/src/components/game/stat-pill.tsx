import { StyleSheet, Text, View } from 'react-native';

import { GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

type Props = {
	label: string;
	value: string | number;
	/** 'accent' renders the indigo highlight used for scores. */
	tone?: 'default' | 'accent' | 'warning';
};

export function StatPill({ label, value, tone = 'default' }: Props) {
	const surface = useGameSurface();
	const toneStyles =
		tone === 'accent'
			? { backgroundColor: GamePalette.primaryLight, borderColor: GamePalette.primaryLight }
			: tone === 'warning'
				? { backgroundColor: '#fef3c7', borderColor: '#fde68a' }
				: { backgroundColor: surface.tile, borderColor: surface.border };
	const valueColor =
		tone === 'accent' ? GamePalette.primary : tone === 'warning' ? GamePalette.amberDark : surface.text;
	const labelColor = tone === 'default' ? surface.textTertiary : valueColor;

	return (
		<View style={[styles.pill, toneStyles]}>
			<Text style={[styles.label, { color: labelColor }]}>{label}</Text>
			<Text style={[styles.value, { color: valueColor }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	pill: {
		minWidth: 96,
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 14,
		borderWidth: 1,
	},
	label: {
		fontSize: 10,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	value: { fontSize: 17, fontWeight: '800', marginTop: 1 },
});
