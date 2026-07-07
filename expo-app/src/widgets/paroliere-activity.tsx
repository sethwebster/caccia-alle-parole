/**
 * iOS Live Activity for a running Paroliere round: countdown, score, and
 * words found on the Lock Screen banner and in the Dynamic Island.
 *
 * The view function is marked with the 'widget' directive: babel stringifies
 * its body and it is evaluated in the widget extension's JS context where
 * `@expo/ui/swift-ui` components/modifiers are globals. The body must only
 * reference its parameters, its own locals, and un-aliased `@expo/ui`
 * imports — never other module-scope values.
 *
 * The countdown is rendered natively with SwiftUI's auto-updating
 * `Text(timerInterval:)` (m:ss), so no per-second `update()` calls are
 * needed to keep it ticking.
 */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** Content state passed by the bridge (src/lib/live-activity.ts). */
export type ParoliereActivityProps = {
	/** Epoch ms when the round started (countdown lower bound). */
	startedAt: number;
	/** Epoch ms when the round ends (countdown upper bound). */
	endsAt: number;
	score: number;
	wordsFound: number;
};

const ParoliereActivityView = (
	props: ParoliereActivityProps,
	environment: LiveActivityEnvironment,
) => {
	'widget';
	// Banner follows the system color scheme; the Dynamic Island is always
	// dark, so its views use fixed light-on-black colors.
	const dark = environment.colorScheme === 'dark';
	const text = dark ? '#f1f5f9' : '#0f172a';
	const secondary = dark ? '#b6c0d4' : '#475569';
	const timer = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };

	return {
		banner: (
			<HStack alignment="center" modifiers={[padding({ all: 16 })]}>
				<VStack alignment="leading" spacing={2}>
					<Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#4f46e5')]}>
						Paroliere
					</Text>
					<Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>
						{`${props.wordsFound} parole · ${props.score} punti`}
					</Text>
				</VStack>
				<Spacer />
				<Text
					timerInterval={timer}
					countsDown
					modifiers={[font({ size: 32, weight: 'bold', design: 'rounded' }), foregroundStyle(text)]}
				/>
			</HStack>
		),
		compactLeading: <Image systemName="textformat.abc" color="#f59e0b" />,
		compactTrailing: (
			<Text
				timerInterval={timer}
				countsDown
				modifiers={[
					font({ size: 14, weight: 'semibold', design: 'rounded' }),
					foregroundStyle('#f59e0b'),
				]}
			/>
		),
		minimal: <Image systemName="timer" color="#f59e0b" />,
		expandedLeading: (
			<VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 8 })]}>
				<Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#818cf8')]}>
					Paroliere
				</Text>
				<Text modifiers={[font({ size: 13 }), foregroundStyle('#94a3b8')]}>
					{`${props.wordsFound} parole`}
				</Text>
			</VStack>
		),
		expandedTrailing: (
			<Text
				timerInterval={timer}
				countsDown
				modifiers={[
					font({ size: 24, weight: 'bold', design: 'rounded' }),
					foregroundStyle('#ffffff'),
					padding({ trailing: 8 }),
				]}
			/>
		),
		expandedBottom: (
			<Text
				modifiers={[
					font({ size: 15, weight: 'semibold' }),
					foregroundStyle('#ffffff'),
					padding({ bottom: 4 }),
				]}
			>
				{`Punteggio: ${props.score}`}
			</Text>
		),
	};
};

/**
 * Live Activities need no entry in app.json's `widgets` array: the generated
 * widget bundle always includes the generic `WidgetLiveActivity`, keyed by
 * this name at runtime.
 */
export const paroliereActivity = createLiveActivity<ParoliereActivityProps>(
	'ParoliereActivity',
	ParoliereActivityView,
);
