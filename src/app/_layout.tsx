import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initSounds, setSoundsEnabled } from '@/lib/feedback';
import { HabitsProvider, useHabits } from '@/lib/habits-store';
import { useNotificationRouting, useNotificationSync } from '@/lib/notifications';

// Keep the splash up until saved habits are loaded, so we never flash onboarding at a returning user.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <HabitsProvider>
        <RootStack />
      </HabitsProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function RootStack() {
  const { loaded, onboarded, settings, challenges } = useHabits();
  useNotificationSync();
  useNotificationRouting();

  useEffect(() => initSounds(), []);
  useEffect(() => setSoundsEnabled(settings.sounds), [settings.sounds]);
  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  // Present the trophy screen once per won challenge, after the check-in's own burst has played.
  const pendingWin = loaded && onboarded ? challenges.find((c) => c.status === 'won' && !c.celebrated)?.id : undefined;
  const presented = useRef(new Set<string>());
  useEffect(() => {
    if (!pendingWin || presented.current.has(pendingWin)) return;
    const t = setTimeout(() => {
      presented.current.add(pendingWin);
      router.push({ pathname: '/celebrate', params: { id: pendingWin } });
    }, 700);
    return () => clearTimeout(t);
  }, [pendingWin]);

  return (
    <Stack>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new" options={{ title: 'New Habit', presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: '', headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen
          name="celebrate"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade', gestureEnabled: false }}
        />
      </Stack.Protected>
    </Stack>
  );
}
