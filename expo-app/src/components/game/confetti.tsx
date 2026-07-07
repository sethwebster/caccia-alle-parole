import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from 'react-native-reanimated';

const COLORS = ['#C33F2E', '#D99A2B', '#578A3F', '#D9553F', '#F3C4B4'];
const PIECE_COUNT = 80;
// Air-drag model: v' = g − k·v. Pieces explode out, brake, then flutter
// down at terminal velocity g/k instead of rocketing straight off screen.
const GRAVITY = 900; // px/s²
const DRAG = 2.2; // 1/s
const MAX_LIFE_MS = 3200;
const MAX_DELAY_MS = 900;
const CLEANUP_MS = MAX_LIFE_MS + MAX_DELAY_MS + 400;

type Piece = {
	id: number;
	x0: number;
	y0: number;
	vx: number;
	vy: number;
	life: number; // seconds
	delay: number;
	size: number;
	color: string;
	spin: number; // deg/s
	flutter: number; // tumble frequency, rad/s
};

/** Two side cannons firing arcs toward the centre, plus a radial centre burst. */
function makePieces(seed: number): Piece[] {
	const { width, height } = Dimensions.get('window');
	return Array.from({ length: PIECE_COUNT }, (_, i) => {
		const kind = i % 5; // 0,1 left cannon · 2,3 right cannon · 4 centre burst
		let x0: number, y0: number, angle: number, speed: number, delay: number;
		if (kind === 4) {
			x0 = width / 2;
			y0 = height * 0.45;
			angle = Math.random() * Math.PI * 2;
			speed = 300 + Math.random() * 600;
			delay = Math.random() * 120;
		} else {
			const left = kind < 2;
			x0 = left ? -8 : width + 8;
			y0 = height * (0.7 + Math.random() * 0.15);
			// 50°–80° above horizontal, aimed inward.
			const elevation = (50 + Math.random() * 30) * (Math.PI / 180);
			angle = left ? -elevation : Math.PI + elevation;
			speed = 1000 + Math.random() * 700;
			delay = Math.random() * MAX_DELAY_MS;
		}
		return {
			id: seed * PIECE_COUNT + i,
			x0,
			y0,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - (kind === 4 ? 250 : 0), // centre burst gets an upward kick
			life: (2600 + Math.random() * (MAX_LIFE_MS - 2600)) / 1000,
			delay,
			size: 6 + Math.random() * 6,
			color: COLORS[i % COLORS.length],
			spin: (Math.random() - 0.5) * 1080,
			flutter: 6 + Math.random() * 10,
		};
	});
}

/** Regenerates the particle set every time `burst` increments past 0. */
function useConfettiPieces(burst: number): Piece[] {
	const [pieces, setPieces] = useState<Piece[]>([]);
	useEffect(() => {
		if (burst <= 0) return;
		setPieces(makePieces(burst));
		const t = setTimeout(() => setPieces([]), CLEANUP_MS);
		return () => clearTimeout(t);
	}, [burst]);
	return pieces;
}

/**
 * Full-screen celebratory confetti. Fire it by incrementing `burst`
 * (0 = idle); each increment produces a fresh volley, so repeat wins
 * retrigger correctly.
 */
export function Confetti({ burst }: { burst: number }) {
	const pieces = useConfettiPieces(burst);
	if (pieces.length === 0) return null;
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{pieces.map((piece) => (
				<ConfettiPiece key={piece.id} piece={piece} />
			))}
		</View>
	);
}

/** Ballistic arc: launch velocity + gravity, spinning and tumbling in flight. */
function useLaunchAnimation(piece: Piece) {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = withDelay(piece.delay, withTiming(1, { duration: piece.life * 1000 }));
	}, [piece, progress]);

	return useAnimatedStyle(() => {
		const t = progress.value * piece.life;
		// Closed-form drag: v(t) = vT + (v0 − vT)·e^(−kt), vT = g/k.
		const settle = (1 - Math.exp(-DRAG * t)) / DRAG;
		const terminal = GRAVITY / DRAG;
		const sway = Math.sin(t * piece.flutter * 0.6) * 14 * Math.min(1, t);
		return {
			transform: [
				{ translateX: piece.x0 + piece.vx * settle + sway },
				{ translateY: piece.y0 + terminal * t + (piece.vy - terminal) * settle },
				{ rotate: `${piece.spin * t}deg` },
				{ scaleY: Math.cos(t * piece.flutter) },
			],
			opacity: progress.value < 0.8 ? 1 : (1 - progress.value) / 0.2,
		};
	});
}

function ConfettiPiece({ piece }: { piece: Piece }) {
	const style = useLaunchAnimation(piece);

	return (
		<Animated.View
			style={[
				styles.piece,
				style,
				{ width: piece.size, height: piece.size * 1.6, backgroundColor: piece.color },
			]}
		/>
	);
}

const styles = StyleSheet.create({
	piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
});
