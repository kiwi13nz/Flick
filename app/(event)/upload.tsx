import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Upload, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { StorageService } from '@/lib/storage';
import { PhotoService } from '@/services/api';
import { LoadingState } from '@/components/shared/LoadingState';

export default function UploadPhotoScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const playerId = params.playerId as string;
  const taskId = params.taskId as string;
  const taskDescription = params.taskDescription as string;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImage) return;

    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Upload to storage
      const photoUrl = await StorageService.uploadPhoto(selectedImage, eventId);

      // Create submission
      await PhotoService.upload(taskId, playerId, photoUrl);

      // Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', 'Please try again');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setUploading(false);
    }
  };

  if (uploading) {
    return <LoadingState message="Uploading your photo..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Photo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Task Info */}
        <View style={styles.taskCard}>
          <Text style={styles.taskLabel}>Challenge</Text>
          <Text style={styles.taskDescription}>{taskDescription}</Text>
        </View>

        {/* Image Preview or Picker */}
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <TouchableOpacity style={styles.pickerOption} onPress={takePhoto}>
              <View style={styles.pickerIconContainer}>
                <Camera size={40} color={colors.primary} />
              </View>
              <Text style={styles.pickerLabel}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={pickImage}>
              <View style={styles.pickerIconContainer}>
                <Upload size={40} color={colors.primary} />
              </View>
              <Text style={styles.pickerLabel}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Button */}
        {selectedImage && (
          <View style={styles.actions}>
            <Button
              onPress={uploadPhoto}
              loading={uploading}
              disabled={uploading}
              fullWidth
              size="large"
              variant="gradient"
            >
              Upload Photo
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <Sparkles size={64} color={colors.success} />
            <Text style={styles.successTitle}>Photo Uploaded! 🎉</Text>
            <Text style={styles.successSubtitle}>Get ready for reactions!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    padding: spacing.l,
    gap: spacing.xl,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  taskLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.s,
  },
  taskDescription: {
    ...typography.headline,
    color: colors.text,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.l,
    overflow: 'hidden',
    ...shadows.large,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
  },
  changeImageButton: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    gap: spacing.m,
  },
  pickerOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.m,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    borderStyle: 'dashed',
  },
  pickerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  actions: {
    gap: spacing.m,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    gap: spacing.l,
  },
  successTitle: {
    ...typography.title,
    color: colors.text,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});