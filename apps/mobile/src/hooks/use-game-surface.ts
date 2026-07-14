import { GameSurfaces, type GameSurface } from '@/constants/game-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Theme-aware surface colors for game screens. */
export function useGameSurface(): GameSurface {
	const scheme = useColorScheme();
	return scheme === 'dark' ? GameSurfaces.dark : GameSurfaces.light;
}
