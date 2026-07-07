/**
 * iOS home-screen widget for Paròle (daily word puzzle).
 *
 * The view function is marked with the 'widget' directive: babel stringifies
 * its body and the widget extension evaluates it in a separate JS context
 * where the `@expo/ui/swift-ui` components/modifiers are globals. The body
 * must therefore only reference its parameters, its own locals, and
 * un-aliased `@expo/ui` imports — never other module-scope values.
 */
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ParolaWidgetState } from '@/lib/widget-bridge';

/** Placeholder renders receive no props, so every field is optional. */
export type ParolaWidgetProps = Partial<ParolaWidgetState>;

const ParolaWidgetView = (props: ParolaWidgetProps, environment: WidgetEnvironment) => {
	'widget';
	// Colors mirror GamePalette/GameSurfaces, inlined because this body
	// cannot reference module scope.
	const dark = environment.colorScheme === 'dark';
	const card = dark ? '#151b2e' : '#ffffff';
	const text = dark ? '#F8EFE2' : '#43241B';
	const secondary = dark ? '#D9BFA9' : '#96705E';
	const won = props.gameState === 'won';
	const lost = props.gameState === 'lost';
	const status = won ? `Vinto in ${props.guessCount ?? 0}` : lost ? 'Persa' : 'Da giocare';
	const statusColor = won ? '#578A3F' : lost ? '#C33F2E' : text;
	const streak = `🔥 ${props.streak ?? 0}`;

	if (environment.widgetFamily === 'systemSmall') {
		return (
			<VStack alignment="leading" spacing={4} modifiers={[containerBackground(card, 'widget')]}>
				<Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#C33F2E')]}>
					Paròle
				</Text>
				<Spacer />
				<Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(statusColor)]}>
					{status}
				</Text>
				<Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(secondary)]}>
					{streak}
				</Text>
			</VStack>
		);
	}

	return (
		<HStack alignment="center" modifiers={[containerBackground(card, 'widget')]}>
			<VStack alignment="leading" spacing={4}>
				<Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#C33F2E')]}>
					Paròle
				</Text>
				<Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(statusColor)]}>
					{status}
				</Text>
				<Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>
					{`N. ${props.puzzleNumber ?? 1}`}
				</Text>
			</VStack>
			<Spacer />
			<VStack alignment="trailing" spacing={2}>
				<Text modifiers={[font({ size: 28, weight: 'bold' }), foregroundStyle(text)]}>
					{streak}
				</Text>
				<Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>Serie</Text>
			</VStack>
		</HStack>
	);
};

/** Name must match the `widgets[].name` entry in app.json's expo-widgets plugin. */
export const parolaWidget = createWidget<ParolaWidgetProps>('ParolaWidget', ParolaWidgetView);
