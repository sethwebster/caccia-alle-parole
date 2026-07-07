import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useHomeData, type DailyChallenge } from '@/features/home/use-home-data';
import { useGameSurface } from '@/hooks/use-game-surface';

const GAMES = [
  {
    href: '/caccia' as const,
    icon: '🔍',
    title: 'Caccia alle Paròle',
    subtitle: 'Trova le parole nascoste nella griglia',
  },
  {
    href: '/paroliere' as const,
    icon: '🎭',
    title: 'Paroliere+',
    subtitle: 'Collega le lettere, batti il tempo',
    badge: 'Nuovo',
  },
  {
    href: '/impiccato' as const,
    icon: '🎪',
    title: "L'Impiccato",
    subtitle: 'Indovina la parola lettera per lettera',
  },
  {
    href: '/anagrammi' as const,
    icon: '🔀',
    title: 'Anagrammi+',
    subtitle: 'Riordina le lettere contro il tempo',
  },
];

const TABS = [
  { id: 'giochi', emoji: '🎲', label: 'Giochi' },
  { id: 'classifica', emoji: '🏆', label: 'Classifica' },
  { id: 'profilo', emoji: '👤', label: 'Profilo' },
];

export default function HomeScreen() {
  const surface = useGameSurface();
  const insets = useSafeAreaInsets();
  const daily = useHomeData();

  return (
    <View style={[styles.safe, { backgroundColor: surface.background }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Hero topInset={insets.top} streak={daily.streak} />
        <View style={styles.floating}>
          <DailyChallengeCard daily={daily} />
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: surface.text }]}>Tutti i giochi</Text>
            <Text style={[styles.sectionCount, { color: surface.textTertiary }]}>5 giochi</Text>
          </View>
          {GAMES.map((game, i) => (
            <Animated.View key={game.href} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
              <GameCard {...game} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <TabBar bottomInset={insets.bottom} />
    </View>
  );
}

function Hero({ topInset, streak }: { topInset: number; streak: number }) {
  return (
    <View style={[styles.hero, { paddingTop: topInset + 12 }]}>
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <Text style={styles.heroOverline}>BENTORNATO</Text>
          <Text style={styles.heroTitle}>Ciao! 👋</Text>
        </View>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>
            🔥 {streak} {streak === 1 ? 'giorno' : 'giorni'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const DAILY_COPY: Record<DailyChallenge['status'], { subtitle: (d: DailyChallenge) => string; cta: string }> = {
  new: { subtitle: () => 'La parola del giorno ti aspetta', cta: 'Gioca ora' },
  playing: {
    subtitle: (d) => `${d.attempts} tentativi su ${d.maxAttempts} usati`,
    cta: 'Continua a giocare',
  },
  won: { subtitle: (d) => `Risolto in ${d.attempts} tentativi 🎉`, cta: 'Vedi risultato' },
  lost: { subtitle: () => 'Torna domani per una nuova parola', cta: 'Vedi risultato' },
};

function DailyChallengeCard({ daily }: { daily: DailyChallenge }) {
  const surface = useGameSurface();
  const router = useRouter();
  const copy = DAILY_COPY[daily.status];
  const progress = daily.status === 'won' || daily.status === 'lost' ? daily.maxAttempts : daily.attempts;

  return (
    <View style={[styles.dailyCard, { backgroundColor: surface.card }]}>
      <Text style={styles.dailyOverline}>SFIDA DEL GIORNO</Text>
      <View style={styles.dailyRow}>
        <View style={[styles.emojiTile, { backgroundColor: surface.tile }]}>
          <Text style={styles.emojiTileText}>🟩</Text>
        </View>
        <View style={styles.dailyText}>
          <Text style={[styles.dailyTitle, { color: surface.text }]}>Paròle</Text>
          <Text style={[styles.dailySubtitle, { color: surface.textSecondary }]}>
            {daily.hydrated ? copy.subtitle(daily) : ' '}
          </Text>
        </View>
      </View>
      <ProgressBar value={progress} max={daily.maxAttempts} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/parola')}
        style={({ pressed }) => [styles.dailyButton, pressed && styles.pressed]}
      >
        <Text style={styles.dailyButtonText}>{copy.cta}</Text>
      </Pressable>
    </View>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const surface = useGameSurface();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={[styles.progressTrack, { backgroundColor: surface.tile }]}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

function GameCard({
  href,
  icon,
  title,
  subtitle,
  badge,
}: {
  href: (typeof GAMES)[number]['href'];
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const surface = useGameSurface();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.emojiTile, { backgroundColor: surface.tile }]}>
        <Text style={styles.emojiTileText}>{icon}</Text>
      </View>
      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: surface.text }]} numberOfLines={1}>
            {title}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: surface.tile }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.cardSubtitle, { color: surface.textSecondary }]}>{subtitle}</Text>
      </View>
      <View style={styles.chevronCircle}>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </Pressable>
  );
}

function TabBar({ bottomInset }: { bottomInset: number }) {
  const surface = useGameSurface();
  const [active, setActive] = useState('giochi');
  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: surface.card,
          borderTopColor: surface.border,
          paddingBottom: Math.max(bottomInset, 10),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            onPress={() => setActive(tab.id)}
            style={styles.tabItem}
          >
            <Text style={[styles.tabEmoji, !isActive && styles.tabEmojiInactive]}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? GamePalette.primary : surface.textTertiary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  pressed: { transform: [{ scale: 0.97 }] },

  hero: {
    backgroundColor: GamePalette.primary,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingBottom: 86,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 26,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  heroText: { gap: 5 },
  heroOverline: {
    fontFamily: GameFonts.body600,
    fontSize: 13,
    letterSpacing: 3,
    color: GamePalette.onPrimaryMuted,
  },
  heroTitle: { fontFamily: GameFonts.display800, fontSize: 32, color: GamePalette.onPrimary },
  streakPill: {
    height: 32,
    paddingHorizontal: 13,
    marginTop: 4,
    borderRadius: GameRadius.pill,
    backgroundColor: GamePalette.onPrimary,
    justifyContent: 'center',
  },
  streakText: { fontFamily: GameFonts.body700, fontSize: 13.5, color: GamePalette.primary },

  floating: {
    gap: 14,
    paddingHorizontal: 20,
    marginTop: -62,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },

  dailyCard: {
    borderRadius: GameRadius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 14,
    ...GameShadow.raised,
  },
  dailyOverline: {
    fontFamily: GameFonts.body600,
    fontSize: 13,
    letterSpacing: 3,
    color: GamePalette.primary,
  },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dailyText: { flex: 1, gap: 2 },
  dailyTitle: { fontFamily: GameFonts.display700, fontSize: 21 },
  dailySubtitle: { fontFamily: GameFonts.body500, fontSize: 14 },
  dailyButton: {
    height: 48,
    borderRadius: GameRadius.md,
    backgroundColor: GamePalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyButtonText: { fontFamily: GameFonts.display700, fontSize: 17, color: GamePalette.onPrimary },

  progressTrack: { height: 10, borderRadius: GameRadius.pill, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    borderRadius: GameRadius.pill,
    backgroundColor: GamePalette.primary,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontFamily: GameFonts.display700, fontSize: 17 },
  sectionCount: { fontFamily: GameFonts.body600, fontSize: 12.5 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: GameRadius.lg,
    paddingVertical: 17,
    paddingHorizontal: 20,
    ...GameShadow.card,
  },
  emojiTile: {
    width: 54,
    height: 54,
    borderRadius: GameRadius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiTileText: { fontSize: 27 },
  cardText: { flex: 1, gap: 2, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: GameFonts.display700, fontSize: 21, flexShrink: 1 },
  cardSubtitle: { fontFamily: GameFonts.body500, fontSize: 14 },
  badge: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: GameRadius.pill,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: GameFonts.body700, fontSize: 12.5, color: GamePalette.primary },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GamePalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontFamily: GameFonts.display800,
    fontSize: 17,
    lineHeight: 20,
    color: GamePalette.onPrimary,
  },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, paddingVertical: 5 },
  tabEmoji: { fontSize: 21 },
  tabEmojiInactive: { opacity: 0.45 },
  tabLabel: { fontFamily: GameFonts.body700, fontSize: 11.5 },
});
