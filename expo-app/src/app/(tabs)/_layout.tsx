import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { GamePalette } from '@/constants/game-theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={GamePalette.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }}
          md="sports_esports"
        />
        <NativeTabs.Trigger.Label>Giochi</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="classifica">
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="trophy" />
        <NativeTabs.Trigger.Label>Classifica</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profilo">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
        />
        <NativeTabs.Trigger.Label>Profilo</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
