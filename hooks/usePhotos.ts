import { useState, useEffect } from 'react';
import { PhotoService } from '@/services/api';
import { supabase } from '@/lib/supabase';
import type { Photo } from '@/types';

export function usePhotos(eventId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let channel: any;

    const loadPhotos = async () => {
      try {
        setLoading(true);
        const data = await PhotoService.getByEventId(eventId);
        setPhotos(data);
      } catch (err) {
        console.error('Failed to load photos:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = async () => {
      // Get task IDs for this event
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('event_id', eventId);

      if (!tasks || tasks.length === 0) return;

      const taskIds = tasks.map((t) => t.id);

      // Subscribe to submissions changes
      channel = supabase
        .channel(`photos-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'submissions',
            filter: `task_id=in.(${taskIds.join(',')})`,
          },
          () => {
            console.log('New photo uploaded, refreshing...');
            loadPhotos();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'submissions',
            filter: `task_id=in.(${taskIds.join(',')})`,
          },
          (payload) => {
            console.log('Photo updated:', payload.new);
            setPhotos((prev) =>
              prev.map((photo) =>
                photo.id === payload.new.id
                  ? { ...photo, reactions: payload.new.reactions }
                  : photo
              )
            );
          }
        )
        .subscribe();
    };

    loadPhotos();
    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [eventId]);

  const refresh = async () => {
    try {
      const data = await PhotoService.getByEventId(eventId);
      setPhotos(data);
    } catch (err) {
      console.error('Failed to refresh photos:', err);
      setError(err as Error);
    }
  };

  return { photos, loading, error, refresh };
}