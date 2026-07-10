import { ImpiccatoScreen } from '@/features/impiccato/impiccato-screen';
import { useDailyGameRouteMode } from '@/features/daily/use-daily-game-route-mode';

export default function ImpiccatoRoute() {
	const routeSession = useDailyGameRouteMode('impiccato');
	return <ImpiccatoScreen routeSession={routeSession} />;
}
