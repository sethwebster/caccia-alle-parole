import { WordSearchScreen } from '@/features/caccia/word-search-screen';
import { useDailyGameRouteMode } from '@/features/daily/use-daily-game-route-mode';

export default function CacciaRoute() {
	const routeSession = useDailyGameRouteMode('caccia');
	return <WordSearchScreen routeSession={routeSession} />;
}
