import { ParolaScreen } from '@/features/parola/parola-screen';
import { useDailyGameRouteMode } from '@/features/daily/use-daily-game-route-mode';

export default function ParolaRoute() {
	const routeSession = useDailyGameRouteMode('parola');
	return <ParolaScreen routeSession={routeSession} />;
}
