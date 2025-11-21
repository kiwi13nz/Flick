import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType = 
  | 'new_photo'
  | 'reaction'
  | 'rank_change'
  | 'event_start'
  | 'winner_announced';

export const NotificationService = {
  async requestPermissions() {
    if (Platform.OS === 'web') return true;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  },

  async scheduleLocal(
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ) {
    if (Platform.OS === 'web') {
      // Use browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Immediate
    });
  },

  async notifyNewPhoto(playerName: string, taskDescription: string) {
    await this.scheduleLocal(
      'new_photo',
      '📸 New Photo!',
      `${playerName} just uploaded: "${taskDescription}"`
    );
  },

  async notifyReaction(playerName: string, reaction: string, count: number) {
    const emoji = reaction === 'heart' ? '❤️' : reaction === 'fire' ? '🔥' : '💯';
    await this.scheduleLocal(
      'reaction',
      `${emoji} You got a reaction!`,
      `${playerName} reacted to your photo (${count} total)`
    );
  },

  async notifyRankChange(newRank: number, oldRank: number) {
    if (newRank < oldRank) {
      await this.scheduleLocal(
        'rank_change',
        `🚀 You moved up!`,
        `You're now #${newRank}! Keep going!`
      );
    }
  },
};