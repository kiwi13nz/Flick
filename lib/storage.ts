import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

const OWNER_EVENTS_KEY = '@owner_events';

export type OwnerEvent = {
  eventId: string;
  eventCode: string;
  ownerId: string;
  title: string;
  createdAt: string;
};

export async function saveOwnerEvent(event: OwnerEvent) {
  try {
    const existing = await getOwnerEvents();
    const updated = [...existing.filter((e) => e.eventId !== event.eventId), event];
    await AsyncStorage.setItem(OWNER_EVENTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save owner event:', error);
  }
}

export async function getOwnerEvents(): Promise<OwnerEvent[]> {
  try {
    const data = await AsyncStorage.getItem(OWNER_EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get owner events:', error);
    return [];
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const StorageService = {
  async uploadPhoto(uri: string, eventId: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const arrayBuffer = base64ToArrayBuffer(base64);

      const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },
};