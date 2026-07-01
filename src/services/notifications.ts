import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Show notifications even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  let token: string;
  try {
    const result = await Notifications.getDevicePushTokenAsync();
    token = result.data;
  } catch (e) {
    // Firebase not yet initialized — token registration will retry on next login
    console.warn('Push token registration failed:', e);
    return;
  }

  await supabase
    .from('user_profile')
    .update({
      push_token: token,
      push_token_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
