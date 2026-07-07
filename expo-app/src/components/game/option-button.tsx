import { Pressable, StyleSheet, Text } from 'react-native';

import { GamePalette } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

type Props = {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onPress: () => void;
};

/** Selectable chip used on setup screens (categories, difficulty). */
export function OptionButton({ label, active, disabled, onPress }: Props) {
	const surface = useGameSurface();
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.btn,
				{ backgroundColor: surface.card, borderColor: surface.border },
				active && styles.active,
				pressed && { opacity: 0.8 },
				disabled && { opacity: 0.4 },
			]}
		>
			<Text style={[styles.label, { color: active ? '#fff' : surface.text }]}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	btn: {
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
	},
	active: {
		backgroundColor: GamePalette.primary,
		borderColor: GamePalette.primary,
	},
	label: { fontWeight: '700', fontSize: 14 },
});
