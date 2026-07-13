import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { PaywallLocaleToggle } from '@/components/subscription/paywall-locale-toggle';
import { LEGAL_URLS, type PaywallCopy } from '@/features/subscription/subscription-copy';
import type { PaywallProduct } from '@/features/subscription/subscription-model';
import { usePaywallController } from '@/features/subscription/use-paywall-controller';
import { useGameSurface } from '@/hooks/use-game-surface';

export default function PaywallRoute() {
	const surface = useGameSurface();
	const { model, actions } = usePaywallController();
	const copy = model.copy;

	return (
		<SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: surface.background }]}>
			<StatusBar style="auto" />
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				<PaywallLocaleToggle />
				<View style={styles.header}>
					<Text style={styles.overline}>{copy.overline}</Text>
					<Text style={[styles.title, { color: surface.text }]}>{copy.title}</Text>
					<Text style={[styles.subtitle, { color: surface.textSecondary }]}>{copy.subtitle}</Text>
				</View>
				<View style={[styles.benefitsCard, { backgroundColor: surface.card, borderColor: surface.border }]}>
					{copy.benefits.map((benefit) => (
						<View key={benefit} style={styles.benefitRow}>
							<Text style={styles.benefitBullet}>✓</Text>
							<Text style={[styles.benefitText, { color: surface.text }]}>{benefit}</Text>
						</View>
					))}
				</View>
				{model.loadingProducts ? (
					<View style={[styles.loadingCard, { backgroundColor: surface.card, borderColor: surface.border }]}>
						<ActivityIndicator color={GamePalette.primary} />
						<Text style={[styles.loadingText, { color: surface.textSecondary }]}>{copy.loadingProducts}</Text>
					</View>
				) : (
					<View style={styles.plans}>
						{model.products.map((product) => (
							<PlanCard key={product.sku} copy={copy} product={product} selected={product.sku === model.selectedSku} onSelect={() => actions.select(product.sku)} />
						))}
					</View>
				)}
				{model.errorMessage !== undefined ? <Text style={styles.error}>{model.errorMessage}</Text> : null}
				<Pressable
					accessibilityRole="button"
					disabled={model.busy !== undefined || model.selectedSku === undefined}
					onPress={actions.subscribe}
					style={({ pressed }) => [styles.primaryButton, (model.busy !== undefined || model.selectedSku === undefined) && styles.disabled, pressed && styles.pressed]}
				>
					<Text style={styles.primaryButtonText}>{model.subscribeLabel}</Text>
				</Pressable>
				<Pressable accessibilityRole="button" disabled={model.busy !== undefined} onPress={actions.restore} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
					<Text style={styles.linkButtonText}>{model.busy === 'restore' ? copy.restoreBusy : copy.restore}</Text>
				</Pressable>
				<Text style={[styles.disclosure, { color: surface.textTertiary }]}>{copy.autoRenewDisclosure}</Text>
				<View style={styles.legalRow}>
					<Pressable accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}>
						<Text style={styles.legalLink}>{copy.privacyLink}</Text>
					</Pressable>
					<Text style={[styles.legalDivider, { color: surface.textTertiary }]}>·</Text>
					<Pressable accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}>
						<Text style={styles.legalLink}>{copy.termsLink}</Text>
					</Pressable>
				</View>
				<Pressable accessibilityRole="button" onPress={actions.dismiss} style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}>
					<Text style={[styles.dismissText, { color: surface.textSecondary }]}>{copy.close}</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}

function PlanCard({ copy, product, selected, onSelect }: { readonly copy: PaywallCopy; readonly product: PaywallProduct; readonly selected: boolean; readonly onSelect: () => void }) {
	const surface = useGameSurface();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			onPress={onSelect}
			style={({ pressed }) => [
				styles.planCard,
				{ backgroundColor: surface.card, borderColor: selected ? GamePalette.primary : surface.border },
				selected && styles.planSelected,
				pressed && styles.pressed,
			]}
		>
			{product.period === 'annual' ? (
				<View style={styles.bestValueBadge}>
					<Text style={styles.bestValueText}>{copy.bestValueBadge}</Text>
				</View>
			) : null}
			<Text style={[styles.planTitle, { color: surface.text }]}>{copy.planTitle[product.period]}</Text>
			<Text style={[styles.planPrice, { color: surface.text }]}>
				{product.displayPrice} <Text style={[styles.planPeriod, { color: surface.textSecondary }]}>{copy.period[product.period]}</Text>
			</Text>
			{product.hasFreeTrial ? <Text style={styles.trialBadge}>{copy.trialBadge}</Text> : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	scroll: { gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
	pressed: { transform: [{ scale: 0.97 }] },
	disabled: { opacity: 0.5 },
	header: { alignItems: 'center', gap: 6, paddingVertical: 8 },
	overline: { fontFamily: GameFonts.body700, fontSize: 12, letterSpacing: 2, color: GamePalette.primary },
	title: { fontFamily: GameFonts.display800, fontSize: 30, lineHeight: 34, textAlign: 'center' },
	subtitle: { fontFamily: GameFonts.body500, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
	benefitsCard: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 18, gap: 10, ...GameShadow.card },
	benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	benefitBullet: { fontFamily: GameFonts.body700, fontSize: 15, color: GamePalette.successText },
	benefitText: { fontFamily: GameFonts.body600, fontSize: 14.5, flex: 1 },
	loadingCard: { borderWidth: 1, borderRadius: GameRadius.lg, padding: 24, gap: 10, alignItems: 'center', ...GameShadow.card },
	loadingText: { fontFamily: GameFonts.body500, fontSize: 13.5 },
	plans: { flexDirection: 'row', gap: 12 },
	planCard: { flex: 1, borderWidth: 2, borderRadius: GameRadius.lg, padding: 16, gap: 4, ...GameShadow.card },
	planSelected: { borderColor: GamePalette.primary },
	bestValueBadge: { alignSelf: 'flex-start', backgroundColor: GamePalette.amberLight, borderRadius: GameRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
	bestValueText: { fontFamily: GameFonts.body700, fontSize: 10, letterSpacing: 0.8, color: GamePalette.amberDark },
	planTitle: { fontFamily: GameFonts.display700, fontSize: 19 },
	planPrice: { fontFamily: GameFonts.body700, fontSize: 15.5 },
	planPeriod: { fontFamily: GameFonts.body500, fontSize: 13 },
	trialBadge: { fontFamily: GameFonts.body700, fontSize: 12.5, color: GamePalette.successText },
	error: { fontFamily: GameFonts.body600, fontSize: 13.5, color: GamePalette.primaryDark, textAlign: 'center' },
	primaryButton: { minHeight: 52, borderRadius: GameRadius.md, backgroundColor: GamePalette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
	primaryButtonText: { fontFamily: GameFonts.display700, fontSize: 17, color: GamePalette.onPrimary },
	linkButton: { alignItems: 'center', paddingVertical: 6 },
	linkButtonText: { fontFamily: GameFonts.body700, fontSize: 14.5, color: GamePalette.primary },
	disclosure: { fontFamily: GameFonts.body500, fontSize: 12, lineHeight: 17, textAlign: 'center' },
	legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
	legalLink: { fontFamily: GameFonts.body600, fontSize: 12.5, color: GamePalette.primary },
	legalDivider: { fontFamily: GameFonts.body600, fontSize: 12.5 },
	dismissButton: { alignItems: 'center', paddingVertical: 4 },
	dismissText: { fontFamily: GameFonts.body600, fontSize: 14 },
});
