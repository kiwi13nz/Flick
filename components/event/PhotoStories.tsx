import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
  Text,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { ReactionBar } from './ReactionBar';
import type { Photo } from '@/types';

interface PhotoStoriesProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onReact: (photoId: string, reaction: 'heart' | 'fire' | 'hundred') => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 15000; // 15 seconds

export function PhotoStories({ photos, initialIndex, onClose, onReact }: PhotoStoriesProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(photos);
  const progressInterval = useRef<any>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const currentPhoto = localPhotos[currentIndex];

  // Sync photos when prop changes
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  // Progress bar animation
  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        goToNext();
      }
    }, 50);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused]);

  const goToNext = () => {
    if (currentIndex < localPhotos.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 50;
      },
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsPaused(false);

        if (gestureState.dy > 100) {
          // Swipe down to close
          onClose();
        } else if (gestureState.dx > 100) {
          // Swipe right - previous
          goToPrevious();
        } else if (gestureState.dx < -100) {
          // Swipe left - next
          goToNext();
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Tap zones for navigation (left 1/3 = prev, right 1/3 = next)
  const handleTap = (event: any) => {
    const x = event.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) {
      goToPrevious();
    } else if (x > (SCREEN_WIDTH * 2) / 3) {
      goToNext();
    }
  };

  const handleReact = (reaction: 'heart' | 'fire' | 'hundred', isAdding: boolean) => {
    // Optimistic update based on isAdding flag
    setLocalPhotos((prev) =>
      prev.map((photo) =>
        photo.id === currentPhoto.id
          ? {
              ...photo,
              reactions: {
                ...photo.reactions,
                [reaction]: isAdding
                  ? (photo.reactions[reaction] || 0) + 1
                  : Math.max(0, (photo.reactions[reaction] || 0) - 1),
              },
            }
          : photo
      )
    );

    // Notify parent
    onReact(currentPhoto.id, reaction);
  };

  return (
    <View style={styles.container}>
      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {localPhotos.map((_, index) => (
          <View key={index} style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X size={28} color="#fff" />
      </TouchableOpacity>

      {/* Photo with gestures */}
      <Animated.View
        style={[styles.imageContainer, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleTap}
          style={styles.imageTouchable}
        >
          <Image
            source={{ uri: currentPhoto.photo_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <TouchableOpacity style={styles.navLeft} onPress={goToPrevious}>
          <View style={styles.navArrow}>
            <ChevronLeft size={32} color="rgba(255,255,255,0.9)" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      )}

      {currentIndex < localPhotos.length - 1 && (
        <TouchableOpacity style={styles.navRight} onPress={goToNext}>
          <View style={styles.navArrow}>
            <ChevronRight size={32} color="rgba(255,255,255,0.9)" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      )}

      {/* Photo info overlay */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentPhoto.player.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.playerName}>{currentPhoto.player.name}</Text>
            <Text style={styles.taskDescription}>{currentPhoto.task.description}</Text>
          </View>
        </View>
      </View>

      {/* Reactions */}
      <View style={styles.footer}>
        <ReactionBar
          photoId={currentPhoto.id}
          reactions={currentPhoto.reactions}
          onReact={handleReact}
        />
      </View>

      {/* Photo counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {localPhotos.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: spacing.m,
    right: spacing.m,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.m,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: spacing.s,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  navLeft: {
    position: 'absolute',
    left: spacing.m,
    top: '50%',
    marginTop: -40,
    zIndex: 5,
  },
  navRight: {
    position: 'absolute',
    right: spacing.m,
    top: '50%',
    marginTop: -40,
    zIndex: 5,
  },
  navArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 80,
    left: spacing.m,
    right: 80,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.headline,
    color: '#fff',
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taskDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
  },
  counterText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});