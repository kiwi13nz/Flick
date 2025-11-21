import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Heart, Flame, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { ReactionsService } from '@/services/reactions';
import type { Reactions } from '@/types';

interface ReactionBarProps {
  photoId: string;
  reactions: Reactions;
  onReact: (reaction: 'heart' | 'fire' | 'hundred', isAdding: boolean) => void;
}

export function ReactionBar({ photoId, reactions, onReact }: ReactionBarProps) {
  const [activeReactions, setActiveReactions] = useState({
    heart: false,
    fire: false,
    hundred: false,
  });

  const [scaleAnims] = useState({
    heart: new Animated.Value(1),
    fire: new Animated.Value(1),
    hundred: new Animated.Value(1),
  });

  // Load initial state
  useEffect(() => {
    ReactionsService.loadCache().then(() => {
      setActiveReactions({
        heart: ReactionsService.hasReacted(photoId, 'heart'),
        fire: ReactionsService.hasReacted(photoId, 'fire'),
        hundred: ReactionsService.hasReacted(photoId, 'hundred'),
      });
    });
  }, [photoId]);

  const handleReact = async (reaction: 'heart' | 'fire' | 'hundred') => {
    // Prevent double-clicks
    if (scaleAnims[reaction]._value !== 1) return;

    // Animate button
    Animated.sequence([
      Animated.spring(scaleAnims[reaction], {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.spring(scaleAnims[reaction], {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
    ]).start();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Toggle in service (synchronous from cache)
    const isAdding = await ReactionsService.toggleReaction(photoId, reaction);

    // Update local UI immediately
    setActiveReactions((prev) => ({
      ...prev,
      [reaction]: isAdding,
    }));

    // Notify parent (will trigger API call)
    onReact(reaction, isAdding);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnims.heart }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.heart && styles.buttonActive]}
          onPress={() => handleReact('heart')}
          activeOpacity={0.7}
        >
          <Heart
            size={32}
            color={colors.reactionHeart}
            fill={activeReactions.heart ? colors.reactionHeart : 'transparent'}
            strokeWidth={2.5}
          />
          {reactions.heart && reactions.heart > 0 ? (
            <Text style={styles.count}>{reactions.heart}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnims.fire }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.fire && styles.buttonActive]}
          onPress={() => handleReact('fire')}
          activeOpacity={0.7}
        >
          <Flame
            size={32}
            color={colors.reactionFire}
            fill={activeReactions.fire ? colors.reactionFire : 'transparent'}
            strokeWidth={2.5}
          />
          {reactions.fire && reactions.fire > 0 ? (
            <Text style={styles.count}>{reactions.fire}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnims.hundred }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.hundred && styles.buttonActive]}
          onPress={() => handleReact('hundred')}
          activeOpacity={0.7}
        >
          <Award
            size={32}
            color={colors.reactionHundred}
            fill={activeReactions.hundred ? colors.reactionHundred : 'transparent'}
            strokeWidth={2.5}
          />
          {reactions.hundred && reactions.hundred > 0 ? (
            <Text style={styles.count}>{reactions.hundred}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: borderRadius.xl,
    padding: spacing.m,
    gap: spacing.xl,
  },
  button: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.s,
    borderRadius: borderRadius.m,
    minWidth: 60,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  count: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
});