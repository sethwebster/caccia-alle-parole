import { Observe, ObserveRoot } from 'expo-observe';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { registerDailyEntitlementReader } from '@/features/daily/entitlement-reader';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';
import { dailyEntitlementReaderForService, getSubscriptionService } from '@/features/subscription/subscription-runtime';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

// Must run at module scope, before any screen mounts.
Observe.configure({ integrations: { 'expo-router': true } });
registerDailyEntitlementReader(dailyEntitlementReaderForService(getSubscriptionService()));

function RootLayout() {
  const colorScheme = useColorScheme();
  const fontsLoaded = useAppFonts();
  usePushNotifications();
  useScreenInteractive(fontsLoaded);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default ObserveRoot.wrap(RootLayout);
