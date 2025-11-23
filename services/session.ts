import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@player_sessions';
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PlayerSession = {
  eventId: string;
  playerId: string;
  playerName: string;
  joinedAt: string;
  expiresAt: string;
};

export const SessionService = {
  async saveSession(eventId: string, playerId: string, playerName: string) {
    try {
      const sessions = await this.getAllSessions();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_EXPIRY);

      const newSession: PlayerSession = {
        eventId,
        playerId,
        playerName,
        joinedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // Remove old session for this event if exists
      const filteredSessions = sessions.filter((s) => s.eventId !== eventId);
      filteredSessions.push(newSession);

      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filteredSessions));
      
      console.log('✅ Session saved:', { eventId, playerId, playerName, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  async getSession(eventId: string): Promise<PlayerSession | null> {
    try {
      const sessions = await this.getAllSessions();
      const session = sessions.find((s) => s.eventId === eventId);

      if (!session) {
        console.log('ℹ️ No session found for event:', eventId);
        return null;
      }

      // Check if expired (this should already be filtered, but double-check)
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        console.log('⏰ Session expired for event:', eventId);
        await this.clearSession(eventId);
        return null;
      }

      console.log('✅ Session found:', session);
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  async getAllSessions(): Promise<PlayerSession[]> {
    try {
      const data = await AsyncStorage.getItem(SESSION_KEY);
      const sessions: PlayerSession[] = data ? JSON.parse(data) : [];
      
      // Filter out expired sessions automatically
      const now = new Date();
      const validSessions = sessions.filter((s) => {
        const expiresAt = new Date(s.expiresAt);
        return now <= expiresAt;
      });

      // Save cleaned sessions back if we removed any
      if (validSessions.length !== sessions.length) {
        console.log(`🧹 Cleaned up ${sessions.length - validSessions.length} expired sessions`);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(validSessions));
      }

      console.log(`✅ Loaded ${validSessions.length} active sessions`);
      return validSessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  },

  async clearSession(eventId: string) {
    try {
      const sessions = await this.getAllSessions();
      const filtered = sessions.filter((s) => s.eventId !== eventId);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filtered));
      console.log('🗑️ Cleared session for event:', eventId);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },

  async clearAllSessions() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      console.log('🗑️ Cleared all sessions');
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  },
};