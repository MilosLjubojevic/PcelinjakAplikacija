import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/designTokens';

interface InspectionPhotoPickerProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function InspectionPhotoPicker({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
}: InspectionPhotoPickerProps) {
  const pickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit', `Maksimalno ${maxPhotos} fotografija po bilješci`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Dozvola', 'Potrebna je dozvola za pristup galeriji');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit', `Maksimalno ${maxPhotos} fotografija po bilješci`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Dozvola', 'Potrebna je dozvola za pristup kameri');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fotografije ({photos.length}/{maxPhotos})</Text>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={styles.addButtonText}>Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <Ionicons name="images" size={20} color={COLORS.primary} />
          <Text style={styles.addButtonText}>Galerija</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  photoScroll: {
    marginBottom: SPACING.md,
  },
  photoWrapper: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.surface,
    borderRadius: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
