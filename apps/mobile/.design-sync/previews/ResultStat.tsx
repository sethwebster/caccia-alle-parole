import { ResultStat } from '@caccia/mobile';

/** Stats block as laid out inside the results card — one accented row. */
export const BloccoStatistiche = () => (
	<div
		style={{
			width: 320,
			padding: '24px 26px',
			background: '#FFFCF5',
			borderRadius: 28,
			boxShadow: '0 12px 14px rgba(120, 52, 30, 0.18)',
		}}
	>
		<ResultStat label="Punteggio" value={1240} accent />
		<ResultStat label="Parole trovate" value="18/20" />
		<ResultStat label="Tempo" value="2:47" />
		<ResultStat label="Serie giornaliera" value={5} />
	</div>
);

/** Single accented row vs plain row, side by side values. */
export const RigaSingola = () => (
	<div
		style={{
			width: 320,
			padding: '24px 26px',
			background: '#FFFCF5',
			borderRadius: 28,
		}}
	>
		<ResultStat label="Record personale" value={2310} accent />
		<ResultStat label="Tentativi" value={3} />
	</div>
);
