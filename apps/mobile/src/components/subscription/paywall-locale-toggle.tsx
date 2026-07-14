import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFonts, GamePalette, GameRadius } from '@/constants/game-theme';
import { usePaywallLocale } from '@/features/subscription/paywall-locale';
import { PAYWALL_LOCALES } from '@/features/subscription/subscription-copy';
import { useGameSurface } from '@/hooks/use-game-surface';

export function PaywallLocaleToggle() {
	const surface = useGameSurface();
	const { locale, setLocale } = usePaywallLocale();
	return (
		<View style={[styles.track, { backgroundColor: surface.tile }]}>
			{PAYWALL_LOCALES.map((option) => {
				const selected = option.locale === locale;
				return (
					<Pressable
						key={option.locale}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						onPress={() => setLocale(option.locale)}
						style={[styles.option, selected && styles.optionSelected]}
					>
						<Text style={[styles.optionText, { color: selected ? GamePalette.onPrimary : surface.textSecondary }]}>{option.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	track: { flexDirection: 'row', alignSelf: 'center', borderRadius: GameRadius.pill, padding: 3, gap: 2 },
	option: { borderRadius: GameRadius.pill, paddingHorizontal: 12, paddingVertical: 5 },
	optionSelected: { backgroundColor: GamePalette.primary },
	optionText: { fontFamily: GameFonts.body700, fontSize: 12.5 },
});
