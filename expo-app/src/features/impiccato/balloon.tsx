import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
	type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { GameFonts, GamePalette } from '@/constants/game-theme';
import { MAX_LIVES } from '@/features/impiccato/logic';

/** Scale of the balloon with no mistakes; each mistake inflates toward 1. */
const MIN_SCALE = 0.42;

const BURST_PIECES = Array.from({ length: 10 }, (_, i) => ({
	angle: (i / 10) * Math.PI * 2 - Math.PI / 2,
	distance: 58 + (i % 3) * 18,
	size: 8 + (i % 4) * 3,
	color: [GamePalette.primary, GamePalette.amber, GamePalette.primaryDark, GamePalette.onPrimaryMuted][i % 4],
}));

/**
 * Drives the three balloon phases from the mistake count:
 * - inflate: springs to mistakes/(MAX_LIVES-1) so each wrong guess adds a
 *   visible puff (the underdamped spring gives the wobble);
 * - tremble: shivers on the last life as a warning;
 * - pop: on the final mistake, over-inflates for 170ms then bursts.
 * All values reset when a new round brings mistakes back down.
 */
function useBalloonAnimation(mistakes: number) {
	const popped = mistakes >= MAX_LIVES;
	const inflation = useSharedValue(popped ? 1 : mistakes / (MAX_LIVES - 1));
	const pop = useSharedValue(popped ? 1 : 0);
	const bob = useSharedValue(0);
	const tremble = useSharedValue(0);

	useEffect(() => {
		bob.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
	}, [bob]);

	useEffect(() => {
		if (popped) {
			tremble.value = 0;
			inflation.value = withTiming(1.22, { duration: 170, easing: Easing.out(Easing.quad) });
			pop.value = withDelay(170, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
			return;
		}
		pop.value = 0;
		inflation.value = withSpring(mistakes / (MAX_LIVES - 1), { damping: 9, stiffness: 180 });
		tremble.value =
			mistakes === MAX_LIVES - 1
				? withRepeat(withSequence(withTiming(-1.6, { duration: 70 }), withTiming(1.6, { duration: 70 })), -1, true)
				: withTiming(0, { duration: 100 });
	}, [mistakes, popped, inflation, pop, tremble]);

	return { inflation, pop, bob, tremble };
}

type Props = {
	/** 0-6 wrong guesses; the balloon inflates per mistake and pops at 6. */
	mistakes: number;
	width?: number;
};

export function Balloon({ mistakes, width = 170 }: Props) {
	const height = width * 1.5;
	// The knot sits on this line: the balloon scales upward from it while the
	// string hangs below at a constant size.
	const attachY = height * 0.62;
	const { inflation, pop, bob, tremble } = useBalloonAnimation(mistakes);

	const bobStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: interpolate(bob.value, [0, 1], [0, -6]) }],
	}));

	const balloonStyle = useAnimatedStyle(() => ({
		opacity: pop.value > 0 ? 0 : 1,
		transform: [
			{ scale: MIN_SCALE + inflation.value * (1 - MIN_SCALE) },
			{ rotate: `${tremble.value}deg` },
		],
	}));

	const stringStyle = useAnimatedStyle(() => ({
		opacity: pop.value > 0 ? 0 : 1,
	}));

	const popTextStyle = useAnimatedStyle(() => ({
		opacity: pop.value,
		transform: [{ scale: interpolate(pop.value, [0, 0.35, 1], [0.3, 1.3, 1]) }],
	}));

	return (
		<View style={{ width, height }} pointerEvents="none">
			<Animated.View style={[StyleSheet.absoluteFill, bobStyle]}>
				<Animated.View style={[styles.anchor, { width, height: attachY }, balloonStyle]}>
					<Svg width={width} height={attachY} viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet">
						<Ellipse cx={100} cy={98} rx={68} ry={82} fill={GamePalette.primary} />
						<Ellipse cx={74} cy={66} rx={17} ry={27} fill="#FFF8EE" opacity={0.35} transform="rotate(-18 74 66)" />
						<Path d="M100 178 L89 198 L111 198 Z" fill={GamePalette.primaryDark} />
					</Svg>
				</Animated.View>
				<Animated.View style={stringStyle}>
					<Svg
						width={width}
						height={height - attachY}
						viewBox="0 0 200 130"
						preserveAspectRatio="xMidYMin meet"
					>
						<Path
							d="M100 2 C 86 30, 114 52, 100 76 C 92 92, 106 104, 100 118"
							stroke={GamePalette.amberDark}
							strokeWidth={4}
							strokeLinecap="round"
							fill="none"
						/>
					</Svg>
				</Animated.View>
			</Animated.View>

			{BURST_PIECES.map((piece, i) => (
				<BurstPiece key={i} pop={pop} centerX={width / 2} centerY={height * 0.27} {...piece} />
			))}

			<Animated.View style={[styles.popText, popTextStyle]}>
				<Text style={styles.popLabel}>POP!</Text>
			</Animated.View>
		</View>
	);
}

function BurstPiece({
	pop,
	angle,
	distance,
	size,
	color,
	centerX,
	centerY,
}: {
	pop: SharedValue<number>;
	angle: number;
	distance: number;
	size: number;
	color: string;
	centerX: number;
	centerY: number;
}) {
	const style = useAnimatedStyle(() => ({
		opacity: pop.value === 0 ? 0 : 1 - pop.value,
		transform: [
			{ translateX: Math.cos(angle) * distance * pop.value },
			{ translateY: Math.sin(angle) * distance * pop.value },
			{ rotate: `${pop.value * 240}deg` },
			{ scale: 1 - 0.35 * pop.value },
		],
	}));
	return (
		<Animated.View
			style={[
				styles.piece,
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: color,
					left: centerX - size / 2,
					top: centerY - size / 2,
				},
				style,
			]}
		/>
	);
}

const styles = StyleSheet.create({
	anchor: { transformOrigin: '50% 100%' },
	piece: { position: 'absolute' },
	popText: { position: 'absolute', left: 0, right: 0, top: '22%', alignItems: 'center' },
	popLabel: {
		fontSize: 34,
		fontFamily: GameFonts.display800,
		color: GamePalette.primaryDark,
		letterSpacing: 1,
	},
});
