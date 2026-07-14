import { AnagrammiScreen } from '@/features/anagrammi/anagrammi-screen';
import { useDailyGameRouteMode } from '@/features/daily/use-daily-game-route-mode';

export default function AnagrammiRoute() {
	const routeSession = useDailyGameRouteMode('anagrammi');
	return <AnagrammiScreen routeSession={routeSession} />;
}
