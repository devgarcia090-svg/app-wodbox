import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerToken(channelName: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: channelName,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;
}

export function usePushToken(userId: string | undefined, channelName = 'WodBox') {
  useEffect(() => {
    if (!userId) return;
    registerToken(channelName)
      .then(async (token) => {
        if (!token) return;
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
      })
      .catch((e) => {
        // getExpoPushTokenAsync throws if the EAS projectId isn't configured
        // (app.json extra.eas.projectId) — fail silently instead of an
        // unhandled rejection, push notifications just won't work.
        console.warn('[usePushToken] registration failed:', e);
      });
  }, [userId, channelName]);
}
