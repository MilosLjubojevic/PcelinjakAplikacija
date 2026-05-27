import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants/designTokens';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fadeAnims = useRef<Map<number, Animated.Value>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId;
    const fadeAnim = new Animated.Value(0);
    fadeAnims.current.set(id, fadeAnim);

    setToasts(prev => [...prev, { id, message, type }]);

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      fadeAnims.current.delete(id);
    });
  }, []);

  const getIcon = (type: ToastType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
    }
  };

  const getColor = (type: ToastType): string => {
    switch (type) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.danger;
      case 'info': return COLORS.info;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(toast => {
          const fadeAnim = fadeAnims.current.get(toast.id);
          if (!fadeAnim) return null;
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                { borderLeftColor: getColor(toast.type) },
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  }],
                },
              ]}
            >
              <Ionicons name={getIcon(toast.type)} size={20} color={getColor(toast.type)} />
              <AppText style={styles.text} numberOfLines={2}>{toast.message}</AppText>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    marginBottom: SPACING.sm,
    width: '100%',
    ...SHADOW.lg,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
