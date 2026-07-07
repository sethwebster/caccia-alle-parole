import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from 'react-native-reanimated';

const COLORS = ['#C33F2E', '#D99A2B', '#578A3F', '#D9553F', '#F3C4B4'];
const PIECE_COUNT = 60;
const DURATION = 2600;

type Piece = {
	id: number;
	x: number;
	drift: number;
	delay: number;
	size: number;
	color: string;
	spin: number;
};

function makePieces(seed: number): Piece[] {
	const { width } = Dimensions.get('window');
	return Array.from({ length: PIECE_COUNT }, (_, i) => ({
		id: seed * PIECE_COUNT + i,
		x: Math.random() * width,
		drift: (Math.random() - 0.5) * 120,
		delay: Math.random() * 500,
		size: 6 + Math.random() * 6,
		color: COLORS[i % COLORS.length],
		spin: (Math.random() - 0.5) * 720,
	}));
}

/** Regenerates the particle set every time `burst` increments past 0. */
function useConfettiPieces(burst: number): Piece[] {
	const [pieces, setPieces] = useState<Piece[]>([]);
	useEffect(() => {
		if (burst <= 0) return;
		setPieces(makePieces(burst));
		const t = setTimeout(() => setPieces([]), DURATION + 700);
		return () => clearTimeout(t);
	}, [burst]);
	return pieces;
}

/**
 * Full-screen celebratory confetti. Fire it by incrementing `burst`
 * (0 = idle); each increment produces a fresh shower, so repeat wins
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

/** Drives one piece's fall; returns its animated style. */
function useFallAnimation(piece: Piece) {
	const progress = useSharedValue(0);
	const height = Dimensions.get('window').height;

	useEffect(() => {
		progress.value = withDelay(
			piece.delay,
			withTiming(1, { duration: DURATION, easing: Easing.in(Easing.quad) }),
		);
	}, [piece, progress]);

	return useAnimatedStyle(() => ({
		transform: [
			{ translateX: piece.x + piece.drift * progress.value },
			{ translateY: -20 + (height + 40) * progress.value },
			{ rotate: `${piece.spin * progress.value}deg` },
		],
		opacity: progress.value < 0.85 ? 1 : (1 - progress.value) / 0.15,
	}));
}

function ConfettiPiece({ piece }: { piece: Piece }) {
	const style = useFallAnimation(piece);

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
