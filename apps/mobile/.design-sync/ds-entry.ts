/**
 * design-sync bundle entry — exports exactly the components scoped for the
 * CacciaParole design system, plus the theme constants. Kept explicit so the
 * bundle never sweeps app screens/services in.
 */
import type { ComponentProps } from 'react';

// react-native-web injects <style id="react-native-stylesheet"> and fills it
// via CSSOM, so its innerHTML stays empty. Harnesses that scan [id^="r"] for
// mount roots match it first and misread the page as empty — strip the id
// (RNW keeps a direct reference to the sheet; the id is never re-queried).
if (typeof document !== 'undefined') {
  document.getElementById('react-native-stylesheet')?.removeAttribute('id');
}

// This bundle compiles WITHOUT the reanimated worklet transform (esbuild, no
// babel), so `useAnimatedStyle(fn)` with no dependency array throws on web:
// its guard reads `Object.values(updater.__closure ?? {})` and rejects plain
// functions. A non-empty prototype `__closure` defuses the guard: initial
// (mount-state) styles render exactly; animation frames simply don't advance,
// which is correct for static design renders. Remove if the build ever runs
// the real worklets babel plugin.
if (!Object.getOwnPropertyDescriptor(Function.prototype, '__closure')) {
  Object.defineProperty(Function.prototype, '__closure', {
    value: { __dsStaticRender: 0 },
    enumerable: false,
    configurable: true,
  });
}

import { ThemedText } from '../src/components/themed-text';
import { ThemedView } from '../src/components/themed-view';
import { GameHeader } from '../src/components/game/game-header';
import { OptionButton } from '../src/components/game/option-button';
import { StatPill } from '../src/components/game/stat-pill';
import { ResultModal, ResultStat } from '../src/components/game/result-modal';
import { Confetti } from '../src/components/game/confetti';
import { ArchiveAccessCard } from '../src/components/daily/archive-access-card';
import { Balloon } from '../src/features/impiccato/balloon';
import { DailyThemeCard } from '../src/features/daily/daily-theme-card';

export {
  ThemedText,
  ThemedView,
  GameHeader,
  OptionButton,
  StatPill,
  ResultModal,
  ResultStat,
  Confetti,
  ArchiveAccessCard,
  Balloon,
  DailyThemeCard,
};

export { Colors, Fonts, Spacing, MaxContentWidth } from '../src/constants/theme';
export {
  GamePalette,
  GameRadius,
  GameShadow,
  GameFonts,
  GameSurfaces,
} from '../src/constants/game-theme';

// <Name>Props aliases so the emitted .d.ts carries a real API contract for
// components whose props types are file-local.
export type ThemedTextProps = ComponentProps<typeof ThemedText>;
export type ThemedViewProps = ComponentProps<typeof ThemedView>;
export type GameHeaderProps = ComponentProps<typeof GameHeader>;
export type OptionButtonProps = ComponentProps<typeof OptionButton>;
export type StatPillProps = ComponentProps<typeof StatPill>;
export type ResultModalProps = ComponentProps<typeof ResultModal>;
export type ResultStatProps = ComponentProps<typeof ResultStat>;
export type ConfettiProps = ComponentProps<typeof Confetti>;
export type ArchiveAccessCardProps = ComponentProps<typeof ArchiveAccessCard>;
export type BalloonProps = ComponentProps<typeof Balloon>;
export type DailyThemeCardProps = ComponentProps<typeof DailyThemeCard>;
