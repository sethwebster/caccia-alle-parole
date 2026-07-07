import {
	Baloo2_600SemiBold,
	Baloo2_700Bold,
	Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';

/** Loads the design-system webfonts (Baloo 2 display, Figtree body). */
export function useAppFonts(): boolean {
	const [loaded] = useFonts({
		Baloo2_600SemiBold,
		Baloo2_700Bold,
		Baloo2_800ExtraBold,
		Figtree_500Medium,
		Figtree_600SemiBold,
		Figtree_700Bold,
	});
	return loaded;
}
