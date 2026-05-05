import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useLocationStore } from '@/store/locationStore';
import { useCityStore } from '@/store/cityStore';
import { ONBOARDING_KEY } from './onboarding';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setSession } = useAuthStore();
  const { init: initLocation, teardown: teardownLocation } = useLocationStore();
  const hydrateCity = useCityStore((s) => s.hydrate);
  const notifReceivedRef = useRef<Notifications.EventSubscription | null>(null);
  const notifResponseRef = useRef<Notifications.EventSubscription | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    hydrateCity();

    // Auth state — drives analytics user + push token registration
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      initAnalytics(session?.user?.id ?? null);

      // First-run: show onboarding to signed-out users who haven't seen it
      if (!session) {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
          router.replace('/onboarding' as any);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setAnalyticsUser(session?.user?.id ?? null);

      if (session?.user) {
        // Register for push on sign-in (no-op if already granted)
        const token = await registerForPushNotifications();
        if (token) await savePushToken(session.user.id, token);
        clearBadge();
        // Restore location sharing preference
        initLocation(session.user.id);
      } else {
        // User signed out — stop sharing
        const prevSession = await supabase.auth.getSession();
        const prevId = prevSession.data.session?.user?.id;
        if (prevId) teardownLocation(prevId);
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
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="city-picker" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="owner/dashboard" />
        <Stack.Screen name="owner/happy-hours" />
        <Stack.Screen name="owner/menu" />
        <Stack.Screen name="owner/deals" />
        <Stack.Screen name="owner/reservations" />
        <Stack.Screen name="owner/info" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
