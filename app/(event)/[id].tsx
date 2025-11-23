import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ScrollView,
  Share as RNShare,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Camera, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { useEvent } from '@/hooks/useEvent';
import { usePhotos } from '@/hooks/usePhotos';
import { usePlayer } from '@/hooks/usePlayer';
import { useNotifications } from '@/hooks/useNotifications';
import { PhotoGrid } from '@/components/event/PhotoGrid';
import { PhotoStories } from '@/components/event/PhotoStories';
import { Podium } from '@/components/event/Podium';
import { ProgressHeader } from '@/components/event/ProgressHeader';
import { ActivityFeed, type Activity } from '@/components/event/ActivityFeed';
import { TaskPrompt } from '@/components/event/TaskPrompt';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/Button';
import { PhotoService, LeaderboardService } from '@/services/api';
import { NotificationService } from '@/services/notifications';
import { SessionService } from '@/services/session';
import { ReactionsService } from '@/services/reactions';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { TooltipOverlay, shouldShowTooltip } from '@/components/shared/TooltipOverlay';
import type { Photo, PlayerScore } from '@/types';

export default function EventFeedScreen() {
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const playerId = params.playerId as string | null;
  const router = useRouter();

  const { event, tasks, loading: eventLoading } = useEvent(eventId);
  const { photos, loading: photosLoading, refresh } = usePhotos(eventId);
  const { submissions, completionRate } = usePlayer(playerId, eventId);
  const { unreadCount, refresh: refreshNotifications } = useNotifications(playerId);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showTaskPrompt, setShowTaskPrompt] = useState(false);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [previousRank, setPreviousRank] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<{
    visible: boolean;
    step: 'tap_photo' | 'react_to_photo' | 'upload_photo' | null;
  }>({ visible: false, step: null });

  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  // Refresh feed when screen comes into focus (e.g., after upload)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing data');
      handleRefresh();
    }, [eventId])
  );

  useEffect(() => {
    if (!playerId && eventId) {
      SessionService.getSession(eventId).then((session) => {
        if (session) {
          router.replace({
            pathname: '/(event)/[id]',
            params: {
              id: eventId,
              playerId: session.playerId,
            },
          });
        }
      });
    }
  }, [eventId, playerId]);

  useEffect(() => {
    if (eventId && playerId) {
      LeaderboardService.getScores(eventId).then((newScores) => {
        setScores(newScores);

        const playerScore = newScores.find((s) => s.player_id === playerId);
        if (playerScore) {
          if (previousRank !== null && playerScore.rank < previousRank) {
            // Create rank change notification
            NotificationService.notifyRankChange(playerId, playerScore.rank);
            
            addActivity({
              id: `rank-${Date.now()}`,
              type: 'rank',
              message: `🚀 You moved up to #${playerScore.rank}!`,
              timestamp: new Date(),
            });
          }
          setPreviousRank(playerScore.rank);
        }
      });
    } else if (eventId) {
      LeaderboardService.getScores(eventId).then(setScores);
    }
  }, [eventId, photos, playerId]);

  // Show tooltips for new players
  useEffect(() => {
    if (playerId && localPhotos.length > 0) {
      const checkTooltips = async () => {
        // Check if should show "tap photo" tooltip
        const shouldShow = await shouldShowTooltip('tap_photo');
        if (shouldShow) {
          setTimeout(() => {
            setShowTooltip({ visible: true, step: 'tap_photo' });
          }, 1000);
        }
      };
      checkTooltips();
    }
  }, [playerId, localPhotos]);

  const addActivity = (activity: Activity) => {
    setActivities((prev) => [activity, ...prev.slice(0, 9)]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 Refreshing feed...');
    
    try {
      await refresh();
      const newScores = await LeaderboardService.getScores(eventId);
      setScores(newScores);
      
      if (playerId) {
        await refreshNotifications();
        console.log('✅ Notifications refreshed');
      }
      
      console.log('✅ Feed refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePhotoPress = (photo: Photo, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhotoIndex(index);
  };

  const handleReact = async (photoId: string, reaction: 'heart' | 'fire' | 'hundred') => {
    try {
      const isActive = ReactionsService.hasReacted(photoId, reaction);
      
      if (isActive) {
        await PhotoService.addReaction(photoId, reaction);

        // Create notification for photo owner (if not self)
        if (playerId) {
          const photo = localPhotos.find((p) => p.id === photoId);
          if (photo && photo.player.id !== playerId) {
            console.log('🔔 Creating reaction notification for player:', photo.player.id);
            
            // Get current player name for notification
            const { data: player } = await (await import('@/lib/supabase')).supabase
              .from('players')
              .select('name')
              .eq('id', playerId)
              .single();

            if (player) {
              await NotificationService.notifyReaction(
                photo.player.id,
                player.name,
                reaction,
                photoId
              );
              console.log('✅ Reaction notification created');
            }
          }
        }
      } else {
        // Reaction was removed, decrement in DB
        const photo = localPhotos.find((p) => p.id === photoId);
        if (photo && photo.reactions[reaction] && photo.reactions[reaction]! > 0) {
          const newCount = photo.reactions[reaction]! - 1;
          const updatedReactions = {
            ...photo.reactions,
            [reaction]: newCount,
          };
          
          const { supabase } = await import('@/lib/supabase');
          await supabase
            .from('submissions')
            .update({ reactions: updatedReactions })
            .eq('id', photoId);
        }
      }
    } catch (error) {
      console.error('Failed to sync reaction:', error);
    }
  };

  const handleUploadPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTaskPrompt(true);
  };

  const handleTaskSelect = (task: any) => {
    setShowTaskPrompt(false);
    router.push({
      pathname: '/(event)/upload',
      params: { 
        eventId, 
        playerId, 
        taskId: task.id,
        taskDescription: task.description,
        eventCode: event?.code,
        eventTitle: event?.title,
      },
    });
  };

  const handleShareEvent = async () => {
    try {
      await RNShare.share({
        message: `🎉 Join my event "${event?.title}"!\n\n📱 Code: ${event?.code}\n\nDownload Flick and join now!`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleNotificationPress = () => {
    router.push({
      pathname: '/notifications',
      params: { playerId },
    });
  };

  const handleTooltipDismiss = async () => {
    setShowTooltip({ visible: false, step: null });
    
    // Show next tooltip after dismissal
    if (showTooltip.step === 'tap_photo') {
      const shouldShow = await shouldShowTooltip('upload_photo');
      if (shouldShow) {
        setTimeout(() => {
          setShowTooltip({ visible: true, step: 'upload_photo' });
        }, 500);
      }
    }
  };

  if (eventLoading || photosLoading) {
    return <LoadingState message="Loading event..." />;
  }

  if (!event) {
    return (
      <RouteErrorBoundary routeName="event-feed">
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </RouteErrorBoundary>
    );
  }

  const completedTaskIds = submissions.map((s) => s.task_id);
  const playerScore = playerId ? scores.find((s) => s.player_id === playerId) : null;
  const nextPlayerScore = playerScore
    ? scores.find((s) => s.rank === playerScore.rank - 1)
    : null;
  const pointsToNext = nextPlayerScore
    ? nextPlayerScore.reaction_count - playerScore!.reaction_count
    : undefined;

  return (
    <RouteErrorBoundary routeName="event-feed">
      <View style={styles.container}>
        <ActivityFeed activities={activities} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.headerActions}>
                {playerId && (
                  <NotificationBell
                    unreadCount={unreadCount}
                    onPress={handleNotificationPress}
                  />
                )}
                <TouchableOpacity onPress={handleShareEvent}>
                  <Share2 size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {playerId && playerScore && (
            <ProgressHeader
              completedTasks={submissions.length}
              totalTasks={tasks.length}
              currentRank={playerScore.rank}
              pointsToNext={pointsToNext}
            />
          )}

          {scores.length > 0 && <Podium scores={scores} />}

          {localPhotos.length > 0 ? (
            <PhotoGrid photos={localPhotos} onPhotoPress={handlePhotoPress} />
          ) : (
            <EmptyState
              type="feed"
              onAction={playerId ? handleUploadPress : undefined}
              actionLabel={playerId ? "Upload First Photo" : undefined}
            />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {playerId && (
          <View style={styles.footer}>
            <Button
              onPress={handleUploadPress}
              icon={<Camera size={24} color="#fff" />}
              fullWidth
              size="large"
              variant="gradient"
            >
              Upload Photo
            </Button>
          </View>
        )}

        {selectedPhotoIndex !== null && (
          <Modal
            visible={true}
            animationType="fade"
            onRequestClose={() => setSelectedPhotoIndex(null)}
          >
            <PhotoStories
              photos={localPhotos}
              initialIndex={selectedPhotoIndex}
              onClose={() => setSelectedPhotoIndex(null)}
              onReact={handleReact}
            />
          </Modal>
        )}

        <Modal
          visible={showTaskPrompt}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTaskPrompt(false)}
        >
          <TaskPrompt
            tasks={tasks}
            completedTaskIds={completedTaskIds}
            onTaskSelect={handleTaskSelect}
            onClose={() => setShowTaskPrompt(false)}
          />
        </Modal>

        {/* Tooltip Overlay */}
        {showTooltip.visible && showTooltip.step && (
          <TooltipOverlay
            step={showTooltip.step}
            visible={showTooltip.visible}
            onDismiss={handleTooltipDismiss}
          />
        )}
      </View>
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    ...typography.title,
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.m,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.l,
  },
});