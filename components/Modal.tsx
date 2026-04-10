import React, { ReactNode, useCallback } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants/designTokens';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  showCloseButton?: boolean;
  /** When true, closing will prompt "Discard changes?" confirmation */
  hasUnsavedChanges?: boolean;
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  hasUnsavedChanges = false,
}: ModalProps) {
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Nesačuvane promjene',
        'Da li želite da odbacite promjene?',
        [
          { text: 'Nastavi sa unosom', style: 'cancel' },
          { text: 'Odbaci', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {showCloseButton && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    ...SHADOW.lg,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderMedium,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },
});
