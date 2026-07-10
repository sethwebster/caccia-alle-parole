import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GamePalette } from '@/constants/game-theme';
import { DAILY_COPY } from '@/features/daily/daily-copy';
import { styles } from '@/features/daily/daily-route.styles';
import type { DailyRouteReadyModel } from '@/features/daily/daily-route-model';
import { useGameSurface } from '@/hooks/use-game-surface';

type DailyThemeCardProps = {
	readonly model: DailyRouteReadyModel;
	readonly onAnswerTheme: (answerIndex: number) => void;
};

export function DailyThemeCard({ model, onAnswerTheme }: DailyThemeCardProps) {
	const surface = useGameSurface();
	const [revealedChallengeId, setRevealedChallengeId] = useState<string>();
	const choicesVisible = revealedChallengeId === model.challengeId;
	const theme = model.theme;
	const revealChoices = () => setRevealedChallengeId(model.challengeId);
	return (
		<View style={[styles.card, { backgroundColor: surface.card, borderColor: surface.border }]}> 
			<Text style={styles.sectionOverline}>{theme.gate === 'locked' ? DAILY_COPY.theme.lockedOverline : DAILY_COPY.theme.quizOverline}</Text>
			<Text style={[styles.cardTitle, { color: surface.text }]}>{theme.title}</Text>
			<Text style={[styles.copy, { color: surface.textSecondary }]}>{theme.body}</Text>
			{theme.gate === 'unlocked' ? (
				<>
					<Text style={[styles.themePrompt, { color: surface.text }]}>{theme.prompt}</Text>
					{theme.status === 'unanswered' && !choicesVisible ? (
						<Pressable accessibilityRole="button" onPress={revealChoices} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
							<Text style={styles.secondaryButtonText}>{DAILY_COPY.theme.revealChoices}</Text>
						</Pressable>
					) : null}
					{theme.status === 'unanswered' && choicesVisible ? <ThemeChoices choices={theme.choices} onAnswerTheme={onAnswerTheme} /> : null}
					{theme.status === 'answered' ? <ThemeFeedback theme={theme} /> : null}
				</>
			) : null}
		</View>
	);
}

function ThemeChoices({ choices, onAnswerTheme }: { readonly choices: readonly string[]; readonly onAnswerTheme: (answerIndex: number) => void }) {
	const surface = useGameSurface();
	return (
		<View style={styles.themeChoiceList}>
			{choices.map((choice, index) => (
				<Pressable key={choice} accessibilityRole="button" onPress={() => onAnswerTheme(index)} style={({ pressed }) => [styles.themeChoice, { backgroundColor: surface.tile, borderColor: surface.border }, pressed && styles.pressed]}>
					<Text style={[styles.themeChoiceText, { color: surface.text }]}>{choice}</Text>
				</Pressable>
			))}
		</View>
	);
}

function ThemeFeedback({ theme }: { readonly theme: Extract<DailyRouteReadyModel['theme'], { readonly status: 'answered' }> }) {
	const surface = useGameSurface();
	return (
		<View style={[styles.themeFeedback, { backgroundColor: theme.isCorrect ? GamePalette.successLight : GamePalette.amberLight }]}> 
			<Text style={[styles.themeFeedbackTitle, { color: theme.isCorrect ? GamePalette.successText : GamePalette.amberDark }]}>{theme.feedbackTitle}</Text>
			<Text style={[styles.copy, { color: surface.textSecondary }]}>{DAILY_COPY.theme.selectedPrefix}: {theme.selectedChoice}</Text>
			{theme.isCorrect ? null : <Text style={[styles.copy, { color: surface.textSecondary }]}>{DAILY_COPY.theme.correctPrefix}: {theme.correctChoice}</Text>}
			<Text style={[styles.copy, { color: surface.textSecondary }]}>{theme.explanation}</Text>
		</View>
	);
}
