import { useState, useEffect } from 'react';
import { NotificationService, type Notification } from '@/services/notifications';

export function useNotifications(playerId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    loadUnreadCount();
    const channel = setupRealtimeSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [playerId]);

  const loadUnreadCount = async () => {
    if (!playerId) return;

    try {
      setLoading(true);
      const count = await NotificationService.getUnreadCount(playerId);
      setUnreadCount(count);
      console.log('📊 Unread notifications:', count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!playerId) return null;

    return NotificationService.subscribeToPlayer(playerId, (notification) => {
      console.log('🔔 New notification received in hook:', notification);
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });
  };

  const refresh = async () => {
    await loadUnreadCount();
  };

  return { unreadCount, loading, refresh };
}