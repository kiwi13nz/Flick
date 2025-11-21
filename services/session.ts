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
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  async getSession(eventId: string): Promise<PlayerSession | null> {
    try {
      const sessions = await this.getAllSessions();
      const session = sessions.find((s) => s.eventId === eventId);

      if (!session) return null;

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        await this.clearSession(eventId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  async getAllSessions(): Promise<PlayerSession[]> {
    try {
      const data = await AsyncStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : [];
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
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },

  async clearAllSessions() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  },
};