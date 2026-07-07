import Svg, { Circle, Line } from 'react-native-svg';

import { GamePalette } from '@/constants/game-theme';

const GALLOWS_COLOR = GamePalette.primaryDark;
const ROPE_COLOR = GamePalette.amberDark;

type Props = {
	/** 0-6 wrong guesses; reveals head, body, arms, legs progressively. */
	mistakes: number;
	width?: number;
	/** Slate by default; pass a light color on dark surfaces. */
	bodyColor?: string;
};

/** Port of the web app's 200x300 canvas gallows drawing. */
export function Gallows({ mistakes, width = 170, bodyColor = GamePalette.slate }: Props) {
	const body = { stroke: bodyColor, strokeWidth: 3, strokeLinecap: 'round' as const };
	return (
		<Svg width={width} height={width * 1.5} viewBox="0 0 200 300">
			{/* Gallows — always fully visible */}
			<Line x1={20} y1={280} x2={180} y2={280} stroke={GALLOWS_COLOR} strokeWidth={4} strokeLinecap="round" />
			<Line x1={60} y1={280} x2={60} y2={40} stroke={GALLOWS_COLOR} strokeWidth={4} strokeLinecap="round" />
			<Line x1={60} y1={40} x2={140} y2={40} stroke={GALLOWS_COLOR} strokeWidth={4} strokeLinecap="round" />
			{/* Rope */}
			<Line x1={140} y1={40} x2={140} y2={70} stroke={ROPE_COLOR} strokeWidth={4} strokeLinecap="round" />
			{/* Body parts — one per mistake */}
			{mistakes >= 1 && <Circle cx={140} cy={90} r={20} fill="none" {...body} />}
			{mistakes >= 2 && <Line x1={140} y1={110} x2={140} y2={175} {...body} />}
			{mistakes >= 3 && <Line x1={140} y1={125} x2={115} y2={155} {...body} />}
			{mistakes >= 4 && <Line x1={140} y1={125} x2={165} y2={155} {...body} />}
			{mistakes >= 5 && <Line x1={140} y1={175} x2={118} y2={225} {...body} />}
			{mistakes >= 6 && <Line x1={140} y1={175} x2={162} y2={225} {...body} />}
		</Svg>
	);
}
