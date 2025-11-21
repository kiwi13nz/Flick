import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NotificationService } from '@/services/notifications';

export function useNotifications() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Request permissions on mount
    NotificationService.requestPermissions().catch(console.error);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}