import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { DAILY_HOME_ROUTE, PRACTICE_ROUTES } from '@/features/daily/route-policy';
import { useHomeData, type DailyChallenge } from '@/features/home/use-home-data';
import { useStreakReminder } from '@/features/notifications/use-streak-reminder';
import { useUsername } from '@/features/profile/use-username';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

export default function HomeScreen() {
  const surface = useGameSurface();
  const insets = useSafeAreaInsets();
  const daily = useHomeData();
  useScreenInteractive(daily.hydrated);
  useStreakReminder(daily);
  const { username } = useUsername();

  return (
    <View style={[styles.safe, { backgroundColor: surface.background }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: styles.scroll.paddingBottom + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Hero topInset={insets.top} streak={daily.streak} name={username} />
	        <View style={styles.floating}>
	          <DailyChallengeCard daily={daily} />
	          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: surface.text }]}>Allenamento libero</Text>
            <Text style={[styles.sectionCount, { color: surface.textTertiary }]}>{PRACTICE_ROUTES.length} giochi</Text>
          </View>
          {PRACTICE_ROUTES.map((game, i) => (
            <Animated.View key={game.href} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
              <GameCard {...game} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Hero({ topInset, streak, name }: { topInset: number; streak: number; name: string }) {
  return (
    <View style={[styles.hero, { paddingTop: topInset + 12 }]}>
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <Text style={styles.heroOverline}>BENTORNATO</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {name ? `Ciao, ${name}! 👋` : 'Ciao! 👋'}
          </Text>
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
  new: { subtitle: () => DAILY_HOME_ROUTE.subtitle, cta: DAILY_HOME_ROUTE.cta },
  playing: {
    subtitle: () => 'Riprendi i puzzle della sfida di oggi',
    cta: 'Continua la sfida',
  },
  completed: { subtitle: () => 'Sfida completata: risultati e tema ti aspettano', cta: 'Vedi risultato' },
};

function DailyChallengeCard({ daily }: { daily: DailyChallenge }) {
  const surface = useGameSurface();
  const router = useRouter();
  const copy = DAILY_COPY[daily.status];
  const progress = daily.status === 'completed' ? daily.maxAttempts : daily.attempts;

  return (
    <View style={[styles.dailyCard, { backgroundColor: surface.card }]}>
      <Text style={styles.dailyOverline}>SFIDA DEL GIORNO</Text>
      <View style={styles.dailyRow}>
        <View style={[styles.emojiTile, { backgroundColor: surface.tile }]}>
          <Text style={styles.emojiTileText}>🧩</Text>
        </View>
        <View style={styles.dailyText}>
          <Text style={[styles.dailyTitle, { color: surface.text }]}>{DAILY_HOME_ROUTE.title}</Text>
          <Text style={[styles.dailySubtitle, { color: surface.textSecondary }]}>
            {daily.hydrated ? copy.subtitle(daily) : ' '}
          </Text>
        </View>
      </View>
      <ProgressBar value={progress} max={daily.maxAttempts} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/daily')}
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
  href: (typeof PRACTICE_ROUTES)[number]['href'];
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
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={12}
          weight="bold"
          tintColor={GamePalette.onPrimary}
        />
      </View>
    </Pressable>
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
});
