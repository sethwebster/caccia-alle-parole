import { ParoliereScreen } from '@/features/paroliere/paroliere-screen';
import { useDailyGameRouteMode } from '@/features/daily/use-daily-game-route-mode';

export default function ParoliereRoute() {
	const routeSession = useDailyGameRouteMode('paroliere');
	return <ParoliereScreen routeSession={routeSession} />;
}
