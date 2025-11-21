import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E27' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="join-event" />
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