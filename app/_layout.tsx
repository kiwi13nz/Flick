import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { hasSeenOnboarding } from './onboarding';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const seen = await hasSeenOnboarding();
    
    // If user hasn't seen onboarding and not already on onboarding screen
    // Use string comparison instead of type-checking segments array
    const currentRoute = segments.join('/');
    if (!seen && !currentRoute.includes('onboarding')) {
      router.replace('/onboarding');
    }
    
    setIsReady(true);
  };

  if (!isReady) return null;

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E27' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="index" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="join-event" />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="(event)/[id]"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="(event)/upload"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ErrorBoundary>
  );
}