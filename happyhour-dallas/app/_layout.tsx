import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  clearBadge,
} from '@/lib/notifications';
import { initAnalytics, setAnalyticsUser, teardownAnalytics } from '@/lib/analytics';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setSession } = useAuthStore();
  const notifReceivedRef = useRef<Notifications.EventSubscription | null>(null);
  const notifResponseRef = useRef<Notifications.EventSubscription | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    // Auth state — drives analytics user + push token registration
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      initAnalytics(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setAnalyticsUser(session?.user?.id ?? null);

      if (session?.user) {
        // Register for push on sign-in (no-op if already granted)
        const token = await registerForPushNotifications();
        if (token) await savePushToken(session.user.id, token);
        clearBadge();
      }
    });

    // Notification listeners
    notifReceivedRef.current = addNotificationReceivedListener((_n) => {
      clearBadge();
    });
    notifResponseRef.current = addNotificationResponseListener();

    return () => {
      subscription.unsubscribe();
      notifReceivedRef.current?.remove();
      notifResponseRef.current?.remove();
      teardownAnalytics();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor="#1A0A00" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A0A00' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="reservation/[restaurantId]" />
        <Stack.Screen name="review/[restaurantId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
